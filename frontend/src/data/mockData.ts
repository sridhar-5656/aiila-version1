export interface MockEntity {
  id: string;
  name: string;
  type: string;
  risk_score: number;
  risk_level: string;
  description: string;
}

export interface GraphNode {
  id: string;
  name: string;
  group: number;
  risk_score: number;
  risk_level: string;
  description: string;
}

export interface GraphLink {
  source: string;
  target: string;
}

export const mockEntities: MockEntity[] = [
  {
    id: "ENT-001",
    name: "@shadowprophet",
    type: "account",
    risk_score: 96,
    risk_level: "critical",
    description:
      "Coordinated disinformation campaign detected.",
  },

  {
    id: "ENT-002",
    name: "@void_herald",
    type: "account",
    risk_score: 94,
    risk_level: "critical",
    description:
      "Suspected recruitment messaging pattern.",
  },

  {
    id: "ENT-003",
    name: "Wallet Cluster Alpha",
    type: "wallet",
    risk_score: 91,
    risk_level: "critical",
    description:
      "Crypto wallet fraud network.",
  },

  {
    id: "ENT-004",
    name: "@mirrorecho",
    type: "account",
    risk_score: 88,
    risk_level: "high",
    description:
      "Narrative injection attack vector.",
  },

  {
    id: "ENT-005",
    name: "@rapidfire_99",
    type: "account",
    risk_score: 87,
    risk_level: "high",
    description:
      "High velocity posting anomaly.",
  },
];

export const graphData: {
  nodes: GraphNode[];
  links: GraphLink[];
} = {
  nodes: mockEntities.map(
    (entity, index): GraphNode => ({
      id: entity.id,
      name: entity.name,
      group: index + 1,
      risk_score: entity.risk_score,
      risk_level: entity.risk_level,
      description: entity.description,
    })
  ),

  links: [
    {
      source: "ENT-001",
      target: "ENT-002",
    },

    {
      source: "ENT-002",
      target: "ENT-003",
    },

    {
      source: "ENT-003",
      target: "ENT-004",
    },

    {
      source: "ENT-004",
      target: "ENT-005",
    },

    {
      source: "ENT-005",
      target: "ENT-001",
    },
  ],
};