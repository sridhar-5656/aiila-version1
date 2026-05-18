import React from "react";

interface Entity {
  id: string;
  name: string;
  type: string;
  risk_score: number;
  risk_level: string;
  description: string;
}

interface Props {
  entity: Entity;
  onClick?: () => void;
}

const EntityCard: React.FC<Props> = ({
  entity,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-slate-900 border border-slate-700 rounded-2xl p-5 hover:border-sky-500 transition-all duration-300"
    >

      {/* Header */}
      <div className="flex items-center justify-between">

        <h2 className="text-lg font-semibold text-white">
          {entity.name}
        </h2>

        <span
          className={`text-xs px-2 py-1 rounded-full ${
            entity.risk_level === "critical"
              ? "bg-red-500/20 text-red-400"
              : "bg-yellow-500/20 text-yellow-400"
          }`}
        >
          {entity.risk_level}
        </span>

      </div>

      {/* Details */}
      <div className="mt-4 space-y-2">

        <p className="text-slate-400 text-sm">
          ID:
          <span className="text-white ml-2">
            {entity.id}
          </span>
        </p>

        <p className="text-slate-400 text-sm">
          Type:
          <span className="text-white ml-2">
            {entity.type}
          </span>
        </p>

        <p className="text-slate-400 text-sm">
          Risk Score:
          <span className="text-white ml-2">
            {entity.risk_score}
          </span>
        </p>

        <div className="pt-2">

          <p className="text-slate-400 text-sm mb-1">
            Description
          </p>

          <p className="text-slate-300 text-sm">
            {entity.description}
          </p>

        </div>

      </div>

    </div>
  );
};

export default EntityCard;