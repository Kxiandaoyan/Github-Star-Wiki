'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Network, Orbit, Search, Sparkles, Star } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { GraphCluster, GraphLink, GraphNode, ProjectGraphData } from '@/lib/project-network';

interface GraphPageProps {
  graph: ProjectGraphData;
  initialProjectId?: number | null;
}

interface PositionedNode {
  node: GraphNode;
  x: number;
  y: number;
  radius: number;
}

interface PositionedCluster {
  cluster: GraphCluster;
  x: number;
  y: number;
  radius: number;
  visibleCount: number;
}

interface LayoutData {
  nodes: PositionedNode[];
  clusters: PositionedCluster[];
}

interface RelatedNodeEntry {
  node: GraphNode;
  link: GraphLink;
}

type DisplayScale = 'focus' | 'balanced' | 'all';

const displayScaleOptions: Array<{ id: DisplayScale; label: string; limit: number }> = [
  { id: 'focus', label: '聚焦', limit: 320 },
  { id: 'balanced', label: '平衡', limit: 900 },
  { id: 'all', label: '全部', limit: 2200 },
];

function formatStars(stars: number) {
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(1)}k`;
  }

  return String(stars);
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getLabelMetrics(context: CanvasRenderingContext2D, text: string) {
  const metrics = context.measureText(text);
  return {
    width: metrics.width,
    actualHeight: (metrics.actualBoundingBoxAscent || 9) + (metrics.actualBoundingBoxDescent || 4),
  };
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawTextChip(options: {
  context: CanvasRenderingContext2D;
  x: number;
  y: number;
  text: string;
  isDarkTheme: boolean;
  accent: string;
  emphasized?: boolean;
}) {
  const { context, x, y, text, isDarkTheme, accent, emphasized = false } = options;
  if (!text.trim()) {
    return;
  }

  context.save();
  context.font = emphasized ? '600 12px sans-serif' : '500 11px sans-serif';
  const metrics = getLabelMetrics(context, text);
  const horizontalPadding = emphasized ? 10 : 8;
  const verticalPadding = emphasized ? 6 : 5;
  const width = metrics.width + horizontalPadding * 2;
  const height = metrics.actualHeight + verticalPadding * 2;
  const chipX = x;
  const chipY = y - height / 2;

  drawRoundedRect(context, chipX, chipY, width, height, 999);
  context.fillStyle = isDarkTheme ? 'rgba(7,10,18,0.82)' : 'rgba(255,255,255,0.9)';
  context.strokeStyle = hexToRgba(accent, isDarkTheme ? 0.38 : 0.24);
  context.lineWidth = emphasized ? 1.2 : 1;
  context.shadowColor = isDarkTheme ? 'rgba(0,0,0,0.34)' : 'rgba(15,23,42,0.12)';
  context.shadowBlur = emphasized ? 18 : 10;
  context.fill();
  context.shadowBlur = 0;
  context.stroke();

  context.fillStyle = isDarkTheme ? 'rgba(248,250,252,0.98)' : 'rgba(15,23,42,0.95)';
  context.textBaseline = 'middle';
  context.fillText(text, chipX + horizontalPadding, y);
  context.restore();
}

function getNodeRadius(stars: number, emphasized = false) {
  const base = Math.log10(Math.max(10, stars));
  const radius = 2.6 + base * (emphasized ? 1.9 : 1.45);
  return Math.max(2.8, Math.min(emphasized ? 9.5 : 7.2, radius));
}

function interleaveNodes(groups: GraphNode[][], limit: number) {
  const result: GraphNode[] = [];
  let depth = 0;

  while (result.length < limit) {
    let progressed = false;

    groups.forEach((group) => {
      if (result.length >= limit || depth >= group.length) {
        return;
      }

      result.push(group[depth]);
      progressed = true;
    });

    if (!progressed) {
      break;
    }

    depth += 1;
  }

  return result;
}

function ensurePinnedNodes(nodes: GraphNode[], selectedNode: GraphNode | null, pinnedNeighborIds: Set<number>) {
  const result = [...nodes];
  const seen = new Set(result.map((node) => node.id));

  if (selectedNode && !seen.has(selectedNode.id)) {
    result.unshift(selectedNode);
    seen.add(selectedNode.id);
  }

  return result.filter((node) => {
    if (pinnedNeighborIds.has(node.id)) {
      return true;
    }

    if (selectedNode?.id === node.id) {
      return true;
    }

    return true;
  });
}

function pickVisibleNodes(options: {
  graph: ProjectGraphData;
  matchedNodes: GraphNode[];
  scale: DisplayScale;
  activeClusterId: string | null;
  selectedNode: GraphNode | null;
  pinnedNeighborIds: Set<number>;
}) {
  const { graph, matchedNodes, scale, activeClusterId, selectedNode, pinnedNeighborIds } = options;
  const maxNodes = displayScaleOptions.find((option) => option.id === scale)?.limit || 900;

  if (matchedNodes.length <= maxNodes) {
    return ensurePinnedNodes(matchedNodes, selectedNode, pinnedNeighborIds);
  }

  const groups = graph.clusters
    .map((cluster) => ({
      clusterId: cluster.id,
      nodes: matchedNodes
        .filter((node) => node.cluster === cluster.id)
        .sort((left, right) => right.stars - left.stars),
    }))
    .filter((group) => group.nodes.length > 0);

  if (activeClusterId) {
    const activeGroup = groups.find((group) => group.clusterId === activeClusterId);
    const otherGroups = groups.filter((group) => group.clusterId !== activeClusterId);
    const activeQuota = Math.min(
      activeGroup?.nodes.length || 0,
      scale === 'all' ? maxNodes : Math.max(220, Math.floor(maxNodes * 0.72))
    );
    const result = [
      ...(activeGroup?.nodes.slice(0, activeQuota) || []),
      ...interleaveNodes(otherGroups.map((group) => group.nodes), Math.max(0, maxNodes - activeQuota)),
    ];

    return ensurePinnedNodes(result, selectedNode, pinnedNeighborIds);
  }

  const result = interleaveNodes(groups.map((group) => group.nodes), maxNodes);
  return ensurePinnedNodes(result, selectedNode, pinnedNeighborIds);
}

function buildLayout(options: {
  clusters: GraphCluster[];
  visibleNodes: GraphNode[];
  width: number;
  height: number;
  activeClusterId: string | null;
}) {
  const { clusters, visibleNodes, width, height, activeClusterId } = options;
  const groupedNodes = new Map<string, GraphNode[]>();

  visibleNodes.forEach((node) => {
    groupedNodes.set(node.cluster, [...(groupedNodes.get(node.cluster) || []), node]);
  });

  const visibleClusters = clusters.filter((cluster) => (groupedNodes.get(cluster.id) || []).length > 0);
  const centerX = width / 2;
  const centerY = height / 2;
  const positionedClusters: PositionedCluster[] = [];

  if (visibleClusters.length === 1) {
    const cluster = visibleClusters[0];
    const visibleCount = (groupedNodes.get(cluster.id) || []).length;
    positionedClusters.push({
      cluster,
      x: centerX,
      y: centerY,
      radius: 38 + Math.min(54, Math.sqrt(visibleCount) * 5),
      visibleCount,
    });
  } else if (activeClusterId && visibleClusters.some((cluster) => cluster.id === activeClusterId)) {
    const activeCluster = visibleClusters.find((cluster) => cluster.id === activeClusterId)!;
    const otherClusters = visibleClusters.filter((cluster) => cluster.id !== activeClusterId);

    positionedClusters.push({
      cluster: activeCluster,
      x: centerX,
      y: centerY,
      radius: 44 + Math.min(58, Math.sqrt((groupedNodes.get(activeCluster.id) || []).length) * 5),
      visibleCount: (groupedNodes.get(activeCluster.id) || []).length,
    });

    otherClusters.forEach((cluster, index) => {
      const angle = (-Math.PI / 2) + ((index / Math.max(1, otherClusters.length)) * Math.PI * 2);
      const visibleCount = (groupedNodes.get(cluster.id) || []).length;

      positionedClusters.push({
        cluster,
        x: centerX + Math.cos(angle) * width * 0.34,
        y: centerY + Math.sin(angle) * height * 0.3,
        radius: 30 + Math.min(42, Math.sqrt(visibleCount) * 4.2),
        visibleCount,
      });
    });
  } else {
    visibleClusters.forEach((cluster, index) => {
      const angle = (-Math.PI / 2) + ((index / Math.max(1, visibleClusters.length)) * Math.PI * 2);
      const visibleCount = (groupedNodes.get(cluster.id) || []).length;

      positionedClusters.push({
        cluster,
        x: centerX + Math.cos(angle) * width * 0.34,
        y: centerY + Math.sin(angle) * height * 0.28,
        radius: 34 + Math.min(48, Math.sqrt(visibleCount) * 4.5),
        visibleCount,
      });
    });
  }

  const positionedNodes: PositionedNode[] = [];

  positionedClusters.forEach((item, clusterIndex) => {
    const nodes = (groupedNodes.get(item.cluster.id) || []).sort((left, right) => right.stars - left.stars);
    let placed = 0;
    let ring = 0;

    while (placed < nodes.length) {
      const radius = item.radius + 26 + ring * 22;
      const capacity = Math.max(8, Math.round((2 * Math.PI * radius) / 18));
      const remaining = nodes.length - placed;
      const count = Math.min(capacity, remaining);

      for (let index = 0; index < count; index += 1) {
        const node = nodes[placed + index];
        const angle = ((index / count) * Math.PI * 2) + clusterIndex * 0.72 + ring * 0.28;

        positionedNodes.push({
          node,
          x: item.x + Math.cos(angle) * radius,
          y: item.y + Math.sin(angle) * radius,
          radius: getNodeRadius(node.stars),
        });
      }

      placed += count;
      ring += 1;
    }
  });

  return {
    nodes: positionedNodes,
    clusters: positionedClusters,
  } satisfies LayoutData;
}

function buildStarfield(width: number, height: number) {
  const count = Math.max(40, Math.min(140, Math.round((width * height) / 18000)));
  return Array.from({ length: count }, (_, index) => {
    const seed = index + 1;
    return {
      x: ((seed * 97) % 1000) / 1000 * width,
      y: ((seed * 137) % 1000) / 1000 * height,
      size: 0.7 + (((seed * 17) % 10) / 10) * 1.6,
      alpha: 0.1 + (((seed * 29) % 10) / 10) * 0.2,
      drift: 0.3 + (((seed * 41) % 10) / 10) * 0.8,
    };
  });
}

function isRelatedNodeEntry(entry: GraphNode | RelatedNodeEntry): entry is RelatedNodeEntry {
  return 'node' in entry && 'link' in entry;
}

export function ProjectNetworkGraph({ graph, initialProjectId = null }: GraphPageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { resolvedTheme } = useTheme();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(initialProjectId);
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [hoveredClusterId, setHoveredClusterId] = useState<string | null>(null);
  const [displayScale, setDisplayScale] = useState<DisplayScale>(graph.stats.nodeCount > 900 ? 'balanced' : 'all');
  const [size, setSize] = useState({ width: 1200, height: 760 });
  const isDarkTheme = resolvedTheme !== 'light';

  const clusterLookup = useMemo(
    () => new Map(graph.clusters.map((cluster) => [cluster.id, cluster])),
    [graph.clusters]
  );

  const adjacency = useMemo(() => {
    const map = new Map<number, GraphLink[]>();
    graph.links.forEach((link) => {
      map.set(link.source, [...(map.get(link.source) || []), link]);
      map.set(link.target, [...(map.get(link.target) || []), link]);
    });
    return map;
  }, [graph.links]);

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === selectedId) || null,
    [graph.nodes, selectedId]
  );
  const focusClusterId = selectedNode?.cluster || activeClusterId;

  const pinnedNeighborIds = useMemo(() => {
    if (!selectedId) {
      return new Set<number>();
    }

    return new Set(
      (adjacency.get(selectedId) || [])
        .map((link) => (link.source === selectedId ? link.target : link.source))
        .slice(0, 8)
    );
  }, [adjacency, selectedId]);

  const matchedNodes = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) {
      return graph.nodes;
    }

    return graph.nodes.filter((node) => {
      const clusterLabels = node.semanticTags.map((tag) => clusterLookup.get(tag)?.label || '');
      return [
        node.fullName,
        node.description || '',
        node.oneLineIntro || '',
        node.projectType || '',
        ...node.semanticKeywords,
        ...node.useCases,
        ...node.capabilities,
        ...node.topics,
        ...clusterLabels,
      ]
        .join('\n')
        .toLowerCase()
        .includes(q);
    });
  }, [clusterLookup, deferredQuery, graph.nodes]);

  const visibleNodes = useMemo(
    () => pickVisibleNodes({
      graph,
      matchedNodes,
      scale: displayScale,
      activeClusterId: focusClusterId,
      selectedNode,
      pinnedNeighborIds,
    }),
    [displayScale, focusClusterId, graph, matchedNodes, pinnedNeighborIds, selectedNode]
  );

  const layout = useMemo(
    () => buildLayout({
      clusters: graph.clusters,
      visibleNodes,
      width: size.width,
      height: size.height,
      activeClusterId: focusClusterId,
    }),
    [focusClusterId, graph.clusters, size.height, size.width, visibleNodes]
  );

  const positionedNodeLookup = useMemo(
    () => new Map(layout.nodes.map((item) => [item.node.id, item])),
    [layout.nodes]
  );

  const selectedLinks = useMemo(
    () => (selectedId ? (adjacency.get(selectedId) || []) : []),
    [adjacency, selectedId]
  );

  const relatedNodes = useMemo(() => {
    if (!selectedNode) {
      return [];
    }

    return selectedLinks
      .map((link) => {
        const targetId = link.source === selectedNode.id ? link.target : link.source;
        return {
          node: graph.nodes.find((item) => item.id === targetId) || null,
          link,
        };
      })
      .filter((item): item is { node: GraphNode; link: GraphLink } => Boolean(item.node))
      .sort((left, right) => right.link.weight - left.link.weight || right.node.stars - left.node.stars);
  }, [graph.nodes, selectedLinks, selectedNode]);

  const recommendedNodes = useMemo(() => {
    if (selectedNode) {
      return relatedNodes.map((item) => item.node);
    }

    const preferredCluster = focusClusterId
      ? visibleNodes.filter((node) => node.cluster === focusClusterId)
      : visibleNodes;

    return [...preferredCluster]
      .sort((left, right) => right.stars - left.stars)
      .slice(0, 6);
  }, [focusClusterId, relatedNodes, selectedNode, visibleNodes]);

  const activeCluster = focusClusterId ? clusterLookup.get(focusClusterId) || null : null;
  const starfield = useMemo(() => buildStarfield(size.width, size.height), [size.height, size.width]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const resize = () => {
      const rect = container.getBoundingClientRect();
      setSize({
        width: Math.max(640, Math.floor(rect.width)),
        height: Math.max(620, Math.floor(rect.height)),
      });
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    let frame = 0;
    let raf = 0;

    const draw = () => {
      frame += 1;
      const pulse = Math.sin(frame * 0.03) * 0.5 + 0.5;
      const canvasFill = isDarkTheme ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)';

      context.clearRect(0, 0, size.width, size.height);
      context.fillStyle = canvasFill;
      context.fillRect(0, 0, size.width, size.height);

      starfield.forEach((star) => {
        context.beginPath();
        context.fillStyle = isDarkTheme
          ? `rgba(255,255,255,${star.alpha + Math.sin(frame * 0.01 * star.drift) * 0.04})`
          : `rgba(15,23,42,${Math.max(0.06, star.alpha * 0.42 + Math.sin(frame * 0.01 * star.drift) * 0.02)})`;
        context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        context.fill();
      });

      layout.clusters.forEach((item) => {
        const isActive = item.cluster.id === focusClusterId;
        const isHovered = item.cluster.id === hoveredClusterId;
        const haloRadius = item.radius + 18 + pulse * 6;

        context.beginPath();
        context.fillStyle = hexToRgba(item.cluster.color, isActive ? 0.16 : 0.1);
        context.arc(item.x, item.y, haloRadius, 0, Math.PI * 2);
        context.fill();

        context.beginPath();
        context.strokeStyle = hexToRgba(item.cluster.color, isHovered || isActive ? 0.5 : 0.22);
        context.lineWidth = isActive ? 1.8 : 1.1;
        context.arc(item.x, item.y, item.radius + 4, 0, Math.PI * 2);
        context.stroke();

        context.beginPath();
        context.fillStyle = hexToRgba(item.cluster.color, isActive ? 0.92 : 0.76);
        context.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        context.fill();

        drawTextChip({
          context,
          x: item.x - Math.min(item.radius, 44),
          y: item.y,
          text: item.cluster.label,
          isDarkTheme,
          accent: item.cluster.color,
          emphasized: isActive || isHovered,
        });

        drawTextChip({
          context,
          x: item.x - 14,
          y: item.y + 24,
          text: `${item.visibleCount}`,
          isDarkTheme,
          accent: item.cluster.color,
        });
      });

      if (selectedNode) {
        const source = positionedNodeLookup.get(selectedNode.id);
        if (source) {
          selectedLinks.forEach((link) => {
            const targetId = link.source === selectedNode.id ? link.target : link.source;
            const target = positionedNodeLookup.get(targetId);
            if (!target) {
              return;
            }

            context.beginPath();
            context.strokeStyle = 'rgba(251,146,60,0.44)';
            context.lineWidth = Math.min(2.4, 0.8 + link.weight * 0.12);
            context.moveTo(source.x, source.y);
            context.lineTo(target.x, target.y);
            context.stroke();
          });
        }
      }

      layout.nodes.forEach((item) => {
        const cluster = clusterLookup.get(item.node.cluster);
        const color = cluster?.color || '#0f62fe';
        const isSelected = item.node.id === selectedId;
        const isHovered = item.node.id === hoveredNodeId;
        const isPinned = pinnedNeighborIds.has(item.node.id);
        const highlight = isSelected || isHovered || isPinned;
        const shortLabel = item.node.fullName.split('/').at(-1) || item.node.fullName;
        const displayLabel = isSelected || isPinned ? item.node.fullName : shortLabel;

        context.beginPath();
        context.fillStyle = isSelected
          ? hexToRgba(color, 1)
          : highlight
            ? hexToRgba(color, 0.78)
            : hexToRgba(color, focusClusterId && item.node.cluster !== focusClusterId ? 0.2 : 0.48);
        context.shadowColor = color;
        context.shadowBlur = highlight ? 16 : 7;
        context.arc(item.x, item.y, item.radius + (isSelected ? 1.8 : 0), 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;

        if (isSelected || isHovered || isPinned || item.node.stars >= 12000) {
          drawTextChip({
            context,
            x: item.x + item.radius + 6,
            y: item.y,
            text: displayLabel,
            isDarkTheme,
            accent: color,
            emphasized: isSelected || isPinned,
          });
        }
      });

      raf = window.requestAnimationFrame(draw);
    };

    raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf);
  }, [
    clusterLookup,
    focusClusterId,
    hoveredClusterId,
    hoveredNodeId,
    layout.clusters,
    layout.nodes,
    pinnedNeighborIds,
    positionedNodeLookup,
    selectedId,
    selectedLinks,
    selectedNode,
    isDarkTheme,
    size.height,
    size.width,
    starfield,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const handleMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      let nextHoveredNode: number | null = null;
      let minNodeDistance = Number.POSITIVE_INFINITY;

      layout.nodes.forEach((item) => {
        const distance = Math.hypot(item.x - x, item.y - y);
        const threshold = item.radius + 7;

        if (distance < threshold && distance < minNodeDistance) {
          minNodeDistance = distance;
          nextHoveredNode = item.node.id;
        }
      });

      if (nextHoveredNode) {
        setHoveredNodeId(nextHoveredNode);
        setHoveredClusterId(null);
        canvas.style.cursor = 'pointer';
        return;
      }

      let nextHoveredCluster: string | null = null;
      let minClusterDistance = Number.POSITIVE_INFINITY;

      layout.clusters.forEach((item) => {
        const distance = Math.hypot(item.x - x, item.y - y);
        if (distance < item.radius + 14 && distance < minClusterDistance) {
          minClusterDistance = distance;
          nextHoveredCluster = item.cluster.id;
        }
      });

      setHoveredNodeId(null);
      setHoveredClusterId(nextHoveredCluster);
      canvas.style.cursor = nextHoveredCluster ? 'pointer' : 'default';
    };

    const handleLeave = () => {
      setHoveredNodeId(null);
      setHoveredClusterId(null);
      canvas.style.cursor = 'default';
    };

    const handleClick = () => {
      if (hoveredNodeId) {
        setSelectedId(hoveredNodeId);
        return;
      }

      if (hoveredClusterId) {
        setSelectedId(null);
        setActiveClusterId((current) => current === hoveredClusterId ? null : hoveredClusterId);
      }
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseleave', handleLeave);
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseleave', handleLeave);
      canvas.removeEventListener('click', handleClick);
    };
  }, [hoveredClusterId, hoveredNodeId, layout.clusters, layout.nodes]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_380px]">
      <Card className="surface-panel overflow-hidden rounded-[2rem] shadow-none">
        <CardContent className="p-0">
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(15,98,254,0.18),transparent_22%),radial-gradient(circle_at_78%_18%,rgba(249,115,22,0.16),transparent_20%),radial-gradient(circle_at_50%_82%,rgba(16,185,129,0.12),transparent_22%)]" />

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Semantic Galaxy</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  按用途组织的项目关系网
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full">{graph.stats.nodeCount} 项目</Badge>
                <Badge variant="secondary" className="rounded-full">{graph.stats.clusterCount} 语义簇</Badge>
                <Badge variant="secondary" className="rounded-full">{graph.stats.linkCount} 关联边</Badge>
              </div>
            </div>

            <div className="border-b border-border/60 px-5 py-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索项目名、用途、主题词"
                    className="surface-input h-11 rounded-full border-border/60 pl-10"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {displayScaleOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setDisplayScale(option.id)}
                      className={cn(
                        'rounded-full border px-3 py-2 text-xs transition-colors',
                        displayScale === option.id
                          ? 'border-primary/40 bg-primary/10 text-foreground'
                          : 'border-border/60 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {graph.clusters.map((cluster) => (
                  <button
                    key={cluster.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(null);
                      setActiveClusterId((current) => current === cluster.id ? null : cluster.id);
                    }}
                    className={cn(
                      'rounded-full border px-3 py-2 text-xs transition-colors',
                      focusClusterId === cluster.id
                        ? 'border-primary/40 bg-primary/10 text-foreground'
                        : 'border-border/60 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {cluster.label}
                    <span className="ml-2 text-muted-foreground">{cluster.nodeCount}</span>
                  </button>
                ))}
              </div>
            </div>

            <div ref={containerRef} className="relative h-[74vh] min-h-[640px] overflow-hidden">
              <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

              <div className="pointer-events-none absolute bottom-4 left-4 max-w-sm rounded-[1.4rem] border border-border/60 bg-background/60 px-4 py-3 text-sm leading-7 text-muted-foreground backdrop-blur-xl">
                图谱优先按“用途和功能”聚类，而不是按编程语言分堆。选中项目后才展示真实关联边，避免 500 到 2000 个项目时画面失控。
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="surface-panel rounded-[2rem] shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Network className="h-4 w-4 text-primary" />
              当前视图
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
              <p>当前画布展示 <span className="font-medium text-foreground">{visibleNodes.length}</span> / {matchedNodes.length} 个项目。</p>
              <p>默认会均匀抽样各个语义簇，避免大项目集只剩下一团噪点。</p>
              <p>点簇看领域，点项目看细节；有搜索词时会优先保留命中项目。</p>
            </div>
          </CardContent>
        </Card>

        {activeCluster ? (
          <Card className="surface-panel rounded-[2rem] shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Orbit className="h-4 w-4 text-primary" />
                聚焦语义簇
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: activeCluster.color }} />
                  <h3 className="text-lg font-semibold text-foreground">{activeCluster.label}</h3>
                  <Badge variant="secondary" className="rounded-full">{activeCluster.nodeCount}</Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{activeCluster.description}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="surface-panel rounded-[2rem] shadow-none">
          <CardContent className="p-6">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Selected Project</p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground">{selectedNode.fullName}</h3>
                  </div>
                  <Badge variant="secondary" className="rounded-full">
                    <Star className="mr-1 h-3.5 w-3.5" />
                    {formatStars(selectedNode.stars)}
                  </Badge>
                </div>

                <p className="text-sm leading-7 text-muted-foreground">
                  {selectedNode.oneLineIntro || selectedNode.description || '这个项目还没有生成足够清晰的一句话介绍。'}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full">
                    {relatedNodes.length} 个直接关联
                  </Badge>
                  {selectedNode.semanticTags.map((tag) => {
                    const cluster = clusterLookup.get(tag);
                    if (!cluster) {
                      return null;
                    }

                    return (
                      <Badge key={tag} variant="secondary" className="rounded-full">
                        {cluster.label}
                      </Badge>
                    );
                  })}
                  {selectedNode.topics.slice(0, 4).map((topic) => (
                    <Badge key={topic} variant="outline" className="rounded-full">
                      {topic}
                    </Badge>
                  ))}
                </div>

                <Button asChild className="w-full rounded-xl bg-amber-400 text-amber-950 hover:bg-amber-300">
                  <Link href={`/projects/${selectedNode.id}`}>
                    进入详情页
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Selected Project</p>
                <p className="text-sm leading-7 text-muted-foreground">
                  先点一个项目节点。右侧会显示一句话介绍、用途标签，以及它在这张语义关系网中的直接邻居。
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="surface-panel rounded-[2rem] shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              {selectedNode ? '直接关联' : '推荐浏览'}
            </div>
            <div className="mt-4 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
              {(selectedNode ? relatedNodes : recommendedNodes).length > 0 ? (selectedNode ? relatedNodes : recommendedNodes).map((entry) => {
                const node = isRelatedNodeEntry(entry) ? entry.node : entry;
                const link = isRelatedNodeEntry(entry) ? entry.link : null;

                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedId(node.id)}
                    className={cn(
                      'surface-chip w-full rounded-[1.4rem] px-4 py-4 text-left transition-colors',
                      'hover:border-primary/30'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-6 text-foreground">{node.fullName}</p>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                          {link ? link.reason.join(' / ') : node.oneLineIntro || node.description || '查看这个项目的详情。'}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatStars(node.stars)}</span>
                    </div>
                  </button>
                );
              }) : (
                <p className="text-sm leading-7 text-muted-foreground">当前条件下没有可展示的推荐项目。</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
