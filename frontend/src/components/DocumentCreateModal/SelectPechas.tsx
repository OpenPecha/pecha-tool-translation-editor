import { fetchPechas } from "@/api/pecha";
import React, { useEffect, useState } from "react";

export type PechaType = {
  id: string;
  title: string;
};

function SelectPechas({
  selectedRootPecha,
  setSelectedRootPecha,
}: {
  readonly selectedRootPecha: PechaType | null;
  readonly setSelectedRootPecha: (pecha: PechaType | null) => void;
}) {
  const [filterBy, setFilterBy] = useState<
    "commentary_of" | "version_of" | "translation_of"
  >("commentary_of");
  const [pechas, setPechas] = useState<PechaType[]>([]);

  useEffect(() => {
    fetchPechas({ filterBy })
      .then((pechas) => {
        setPechas(pechas);
      })
      .catch((error) => {
        console.error("Error fetching pechas:", error);
      });
  }, [filterBy]);
  return (
    <>
      <div className="mb-4">
        <label className="block mb-2">Type:</label>
        <div className="flex  gap-2">
          <div className="flex items-center gap-2 border rounded-md p-2">
            <input
              type="radio"
              id="versionOf"
              name="documentType"
              value="version_of"
              checked={filterBy === "version_of"}
              onChange={(e) => setFilterBy(e.target.value)}
            />
            <label htmlFor="versionOf">version of</label>
          </div>
          <div className="flex items-center gap-2 border rounded-md p-2">
            <input
              type="radio"
              id="commentaryOf"
              name="documentType"
              value="commentary_of"
              checked={filterBy === "commentary_of"}
              onChange={(e) => setFilterBy(e.target.value)}
            />
            <label htmlFor="commentaryOf">commentary of</label>
          </div>
          <div className="flex items-center gap-2 border rounded-md p-2">
            <input
              type="radio"
              id="translationOf"
              name="documentType"
              value="translation_of"
              checked={filterBy === "translation_of"}
              onChange={(e) => setFilterBy(e.target.value)}
            />
            <label htmlFor="translationOf">Translation of</label>
          </div>
        </div>
      </div>
      <div className="mb-4">
        <label htmlFor="rootDocSelect" className="block mb-1">
          Connect to OpenPecha:
        </label>
        <select
          id="rootDocSelect"
          onChange={(e) => setSelectedRootPecha(e.target.value)}
          className="w-full p-2 border rounded"
          value={selectedRootPecha?.id}
        >
          <option value="">Select a root document</option>
          {pechas.map((d) => (
            <option key={d.id} value={d.id}>
              {d.id} {d.title}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export default SelectPechas;
