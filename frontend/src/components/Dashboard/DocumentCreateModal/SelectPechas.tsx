import { fetchPechas } from "@/api/pecha";
import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { SelectedPechaType } from "./Forms";

interface PechaMetadata {
  id: string;
  title: {
    bo: string;
  };
}

function SelectPechas({
  selectedPecha,
  setSelectedPecha,
}: {
  readonly selectedPecha: SelectedPechaType | null;
  readonly setSelectedPecha: (data: SelectedPechaType | null) => void;
}) {
  const [type, setType] = useState<
    "pecha" | "commentary" | "version" | "translation"
  >("pecha");

  const {
    data: pechas = [],
    refetch,
    isPending,
  } = useQuery({
    queryKey: ["pechas", type],
    queryFn: () => fetchPechas({ type }),
    staleTime: 5 * 60 * 1000,
  });

  const typeOptions = [
    { label: "Root", value: "pecha" },
    { label: "Version", value: "version" },
    { label: "Commentary", value: "commentary" },
    { label: "Translation", value: "translation" },
  ];

  useEffect(() => {
    refetch();
  }, [type]);

  const handleFilterChange = (value: string) => {
    setType(value as "pecha" | "commentary" | "version" | "translation");
  };

  const handlePechaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPecha = pechas.metadata.find(
      (pecha: PechaMetadata) => pecha.id === e.target.value
    );
    setSelectedPecha({
      id: selectedPecha?.id,
      type: selectedPecha?.type,
      language: selectedPecha?.language,
      title: selectedPecha?.title?.bo ?? selectedPecha?.title?.en ?? "",
    });
  };

  return (
    <>
      <div className="mb-4">
        <div className="block mb-2">Type:</div>
        <RadioGroup
          className="flex"
          defaultValue="version_of"
          value={type}
          onValueChange={handleFilterChange}
        >
          {typeOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={option.label} />
              <Label htmlFor={option.label}>{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="mb-4">
        <label htmlFor="rootDocSelect" className="block mb-1">
          Connect to OpenPecha:
        </label>
        {isPending ? (
          <div>Loading...</div>
        ) : (
          <select
            id="rootDocSelect"
            onChange={handlePechaChange}
            className="w-full p-2 border rounded"
            value={selectedPecha?.id || ""}
          >
            <option value="">Select a root document</option>
            {pechas?.metadata?.map((d: PechaMetadata) => (
              <option key={d.id} value={d.id}>
                {d.id} {d.title.bo}
              </option>
            ))}
          </select>
        )}
      </div>
    </>
  );
}

export default SelectPechas;
