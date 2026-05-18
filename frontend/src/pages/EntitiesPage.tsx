import React, { useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import EntityCard from "../components/EntityCard";

import {
  mockEntities,
  graphData,
} from "../data/mockData";

const EntitiesPage: React.FC = () => {
  const navigate = useNavigate();

  const [selectedNode, setSelectedNode] =
    useState<any>(null);

  // Create circular graph positions
  const graphNodes = useMemo(() => {
    const centerX = 500;
    const centerY = 300;
    const radius = 200;

    return graphData.nodes.map(
      (node, index) => {
        const angle =
          (index / graphData.nodes.length) *
          Math.PI *
          2;

        return {
          ...node,
          x:
            centerX +
            radius * Math.cos(angle),
          y:
            centerY +
            radius * Math.sin(angle),
        };
      }
    );
  }, []);

  // Find node by ID
  const getNode = (id: string) => {
    return graphNodes.find(
      (n) => n.id === id
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-3xl font-bold">
            Entity Relationship Graph Explorer
          </h1>

          <p className="text-slate-400 mt-2">
            Multi-hop entity link traversal
          </p>
        </div>

        <button
          className="border border-slate-700 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800"
          onClick={() =>
            setSelectedNode(null)
          }
        >
          Reset Canvas
        </button>

      </div>

      {/* Main Graph Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Graph Canvas */}
        <div className="lg:col-span-3 bg-[#0b0b0b] border border-slate-800 rounded-2xl relative overflow-hidden h-[700px]">

          {/* Stats */}
          <div className="absolute top-4 left-4 z-10 bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl">
            <span className="text-sky-400 font-semibold">
              {graphData.nodes.length} Nodes
            </span>

            <span className="mx-2 text-slate-500">
              •
            </span>

            <span className="text-slate-300">
              {graphData.links.length} Relationships
            </span>
          </div>

          {/* SVG Relationship Lines */}
          <svg className="absolute inset-0 w-full h-full">

            {graphData.links.map(
              (link, index) => {
                const source =
                  getNode(
                    link.source as string
                  );

                const target =
                  getNode(
                    link.target as string
                  );

                if (
                  !source ||
                  !target
                )
                  return null;

                return (
                  <line
                    key={index}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="#475569"
                    strokeWidth="2"
                  />
                );
              }
            )}

          </svg>

          {/* Graph Nodes */}
          {graphNodes.map((node) => (

            <div
              key={node.id}
              onClick={() => {
                setSelectedNode(node);
              }}
              className="absolute flex flex-col items-center cursor-pointer"
              style={{
                left: node.x,
                top: node.y,
                transform:
                  "translate(-50%, -50%)",
              }}
            >

              {/* Circle */}
              <div
                className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-white font-bold shadow-lg transition-all duration-300 hover:scale-110
                  
                  ${
                    node.risk_level ===
                    "critical"
                      ? "bg-red-600 border-red-300"
                      : "bg-yellow-500 border-yellow-200"
                  }
                `}
              >
                {Math.floor(
                  node.risk_score / 10
                )}
              </div>

              {/* Label */}
              <p className="mt-3 text-sm text-center text-white font-medium max-w-[140px]">
                {node.name}
              </p>

            </div>

          ))}

        </div>

        {/* Right Side Details */}
        <div className="bg-[#151515] border border-slate-800 rounded-2xl p-6 h-[700px] overflow-y-auto">

          {!selectedNode ? (

            <div className="h-full flex flex-col items-center justify-center text-center">

              <div className="text-6xl mb-4">
                ⛓️
              </div>

              <h2 className="text-xl text-slate-400">
                No Node Selected
              </h2>

              <p className="text-slate-500 mt-2 text-sm">
                Click a node to inspect
                its properties
              </p>

            </div>

          ) : (

            <div className="space-y-5">

              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedNode.name}
                </h2>

                <p className="text-slate-400 mt-1">
                  {selectedNode.id}
                </p>
              </div>

              <div
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium
                  
                  ${
                    selectedNode.risk_level ===
                    "critical"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-yellow-500/20 text-yellow-300"
                  }
                `}
              >
                {selectedNode.risk_level.toUpperCase()}
              </div>

              <div className="space-y-3">

                <div>
                  <p className="text-slate-500 text-sm">
                    Risk Score
                  </p>

                  <h3 className="text-3xl font-bold text-white">
                    {selectedNode.risk_score}
                  </h3>
                </div>

                <div>
                  <p className="text-slate-500 text-sm">
                    Description
                  </p>

                  <p className="text-slate-300 mt-1">
                    {
                      selectedNode.description
                    }
                  </p>
                </div>

              </div>

              {/* Connected Nodes */}
              <div>

                <h3 className="text-lg font-semibold text-white mb-3">
                  Connected Nodes
                </h3>

                <div className="space-y-2">

                  {graphData.links
                    .filter(
                      (link) =>
                        link.source ===
                          selectedNode.id ||
                        link.target ===
                          selectedNode.id
                    )
                    .map((link, index) => {
                      const connectedId =
                        link.source ===
                        selectedNode.id
                          ? link.target
                          : link.source;

                      const connectedNode =
                        getNode(
                          connectedId as string
                        );

                      return (
                        <div
                          key={index}
                          className="bg-slate-900 border border-slate-700 rounded-xl p-3 cursor-pointer hover:border-sky-500"
                          onClick={() =>
                            setSelectedNode(
                              connectedNode
                            )
                          }
                        >

                          <p className="text-white font-medium">
                            {
                              connectedNode?.name
                            }
                          </p>

                          <p className="text-slate-400 text-sm">
                            {
                              connectedNode?.id
                            }
                          </p>

                        </div>
                      );
                    })}

                </div>

              </div>

              <button
                onClick={() =>
                  navigate(
                    `/entity/${selectedNode.id}`
                  )
                }
                className="w-full bg-sky-600 hover:bg-sky-700 transition-all rounded-xl py-3 font-semibold"
              >
                View Full Details
              </button>

            </div>

          )}

        </div>

      </div>

      {/* Entity Cards */}
      <div>

        <h2 className="text-2xl font-bold mb-6">
          Entity Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {mockEntities.map((entity) => (

            <EntityCard
              key={entity.id}
              entity={entity}
              onClick={() =>
                navigate(`/entity/${entity.id}`)
              }
            />

          ))}

        </div>

      </div>

    </div>
  );
};

export default EntitiesPage;