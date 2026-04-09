import db from './db';
import type {
  RepositoryAnalysisResult,
  RepositoryDeepReadResult,
} from './project-analysis';
import { parseTopics } from './taxonomy';
import {
  deriveProjectSemanticProfile,
  getSemanticClusterLookup,
  SEMANTIC_CLUSTER_DEFINITIONS,
  type ProjectSemanticProfile,
} from './semantic-profile';

export interface GraphCluster {
  id: string;
  label: string;
  description: string;
  color: string;
  nodeCount: number;
}

export interface GraphNode {
  id: number;
  fullName: string;
  description: string | null;
  oneLineIntro: string | null;
  stars: number;
  projectType: string | null;
  cluster: string;
  semanticTags: string[];
  semanticKeywords: string[];
  useCases: string[];
  capabilities: string[];
  topics: string[];
  relatedTopics: string[];
}

export interface GraphLink {
  source: number;
  target: number;
  weight: number;
  reason: string[];
}

export interface ProjectGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  clusters: GraphCluster[];
  stats: {
    nodeCount: number;
    linkCount: number;
    clusterCount: number;
  };
}

interface GraphRow {
  id: number;
  full_name: string;
  description: string | null;
  one_line_intro: string | null;
  chinese_intro: string | null;
  stars: number;
  project_type: string | null;
  topics: string | null;
  semantic_data: string | null;
  analysis_data: string | null;
  deep_read_data: string | null;
}

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function buildLinkReason(reasonSet: Set<string>) {
  return [...reasonSet].slice(0, 3);
}

export function buildProjectGraph(limit = 1600): ProjectGraphData {
  const rows = db.prepare(`
    SELECT
      p.id,
      p.full_name,
      p.description,
      p.one_line_intro,
      p.chinese_intro,
      p.stars,
      p.project_type,
      p.topics,
      pa.semantic_data,
      pa.analysis_data,
      pa.deep_read_data
    FROM projects p
    LEFT JOIN project_analysis pa ON pa.project_id = p.id
    WHERE p.intro_status = 'completed'
       OR p.wiki_status = 'completed'
       OR p.one_line_status = 'completed'
    ORDER BY p.stars DESC, p.synced_at DESC
    LIMIT ?
  `).all(limit) as GraphRow[];

  const clusterLookup = getSemanticClusterLookup();
  const nodes: GraphNode[] = rows.map((row) => {
    const topics = parseTopics(row.topics);
    const semanticProfile = parseJson<ProjectSemanticProfile>(row.semantic_data)
      || deriveProjectSemanticProfile({
        projectName: row.full_name,
        description: row.description,
        projectType: row.project_type,
        topics,
        oneLineIntro: row.one_line_intro,
        chineseIntro: row.chinese_intro,
        analysis: parseJson<RepositoryAnalysisResult>(row.analysis_data),
        deepRead: parseJson<RepositoryDeepReadResult>(row.deep_read_data),
      });

    return {
      id: row.id,
      fullName: row.full_name,
      description: row.description,
      oneLineIntro: row.one_line_intro,
      stars: row.stars,
      projectType: row.project_type,
      cluster: semanticProfile.primaryCluster,
      semanticTags: semanticProfile.semanticTags,
      semanticKeywords: semanticProfile.keywords,
      useCases: semanticProfile.useCases,
      capabilities: semanticProfile.capabilities,
      topics,
      relatedTopics: topics.map((topic) => topic.trim().toLowerCase()),
    };
  });

  const nodeLookup = new Map(nodes.map((node) => [node.id, node]));
  const clusterMembers = new Map<string, number[]>();
  const tagMembers = new Map<string, number[]>();
  const keywordMembers = new Map<string, number[]>();
  const topicMembers = new Map<string, number[]>();
  const projectTypeMembers = new Map<string, number[]>();

  nodes.forEach((node) => {
    clusterMembers.set(node.cluster, [...(clusterMembers.get(node.cluster) || []), node.id]);

    node.semanticTags.forEach((tag) => {
      tagMembers.set(tag, [...(tagMembers.get(tag) || []), node.id]);
    });

    node.semanticKeywords.forEach((keyword) => {
      keywordMembers.set(keyword, [...(keywordMembers.get(keyword) || []), node.id]);
    });

    node.relatedTopics.forEach((topic) => {
      topicMembers.set(topic, [...(topicMembers.get(topic) || []), node.id]);
    });

    if (node.projectType && node.projectType !== 'unknown') {
      projectTypeMembers.set(node.projectType, [...(projectTypeMembers.get(node.projectType) || []), node.id]);
    }
  });

  const validKeywordMembers = new Map(
    [...keywordMembers.entries()].filter(([, members]) => members.length >= 2 && members.length <= 160)
  );
  const validTopicMembers = new Map(
    [...topicMembers.entries()].filter(([, members]) => members.length >= 2 && members.length <= 120)
  );

  const links: GraphLink[] = [];
  const linkKeys = new Set<string>();

  nodes.forEach((node) => {
    const candidateScores = new Map<number, { weight: number; reasons: Set<string> }>();

    const addCandidates = (candidateIds: number[], weight: number, reason: string, maxCandidates: number) => {
      let count = 0;

      candidateIds.forEach((candidateId) => {
        if (candidateId === node.id || count >= maxCandidates) {
          return;
        }

        const current = candidateScores.get(candidateId) || { weight: 0, reasons: new Set<string>() };
        current.weight += weight;
        current.reasons.add(reason);
        candidateScores.set(candidateId, current);
        count += 1;
      });
    };

    node.semanticTags.forEach((tag) => {
      const cluster = clusterLookup.get(tag);
      if (!cluster) {
        return;
      }

      addCandidates(
        tagMembers.get(tag) || [],
        tag === node.cluster ? 6 : 4,
        tag === node.cluster ? `同属 ${cluster.label}` : `都和 ${cluster.label} 相关`,
        180
      );
    });

    node.semanticKeywords.slice(0, 8).forEach((keyword) => {
      addCandidates(validKeywordMembers.get(keyword) || [], 3, `都和 ${keyword} 相关`, 120);
    });

    node.relatedTopics.slice(0, 4).forEach((topic) => {
      addCandidates(validTopicMembers.get(topic) || [], 1, `都涉及 ${topic}`, 80);
    });

    if (node.projectType && node.projectType !== 'unknown') {
      addCandidates(projectTypeMembers.get(node.projectType) || [], 1, '项目形态接近', 120);
    }

    [...candidateScores.entries()]
      .map(([candidateId, value]) => ({
        target: nodeLookup.get(candidateId),
        weight: value.weight,
        reason: buildLinkReason(value.reasons),
      }))
      .filter((item): item is { target: GraphNode; weight: number; reason: string[] } => Boolean(item.target))
      .filter((item) => item.weight >= 5)
      .sort((left, right) => right.weight - left.weight || right.target.stars - left.target.stars)
      .slice(0, 6)
      .forEach((item) => {
        const key = `${Math.min(node.id, item.target.id)}-${Math.max(node.id, item.target.id)}`;
        if (linkKeys.has(key)) {
          return;
        }

        linkKeys.add(key);
        links.push({
          source: node.id,
          target: item.target.id,
          weight: item.weight,
          reason: item.reason,
        });
      });
  });

  const clusters = SEMANTIC_CLUSTER_DEFINITIONS
    .map((cluster) => ({
      id: cluster.id,
      label: cluster.label,
      description: cluster.description,
      color: cluster.color,
      nodeCount: (clusterMembers.get(cluster.id) || []).length,
    }))
    .filter((cluster) => cluster.nodeCount > 0)
    .sort((left, right) => right.nodeCount - left.nodeCount || left.label.localeCompare(right.label));

  return {
    nodes,
    links,
    clusters,
    stats: {
      nodeCount: nodes.length,
      linkCount: links.length,
      clusterCount: clusters.length,
    },
  };
}
