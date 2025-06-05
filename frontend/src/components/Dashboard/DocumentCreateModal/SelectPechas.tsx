import { fetchPechas } from "@/api/pecha";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";

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

  const { data: pechas = [] } = useQuery({
    queryKey: ["pechas", filterBy],
    queryFn: () => fetchPechas({ filterBy }),
    staleTime: 5 * 60 * 1000,
  });
  return (
    <>
      <div className="mb-4">
        <div className="block mb-2">Type:</div>
        <RadioGroup
          defaultValue="version_of"
          value={filterBy}
          onValueChange={setFilterBy}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="version_of" id="version_of" />
            <Label htmlFor="version_of">version of</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="commentary_of" id="commentary_of" />
            <Label htmlFor="commentary_of">commentary of</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="translation_of" id="translation_of" />
            <Label htmlFor="translation_of">Translation of</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="mb-4">
        <label htmlFor="rootDocSelect" className="block mb-1">
          Connect to OpenPecha:
        </label>
        <select
          id="rootDocSelect"
          onChange={(e) => {
            const selected = pechas.find((p) => p.id === e.target.value);
            setSelectedRootPecha(selected || null);
          }}
          className="w-full p-2 border rounded"
          value={selectedRootPecha?.id || ""}
        >
          <option value="">Select a root document</option>
          {pechas?.metadata?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.id} {d.title.bo}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export default SelectPechas;
