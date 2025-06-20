import {
  fetchPechaBase,
  fetchPechas,
  fetchLanguage,
  fetchCategories,
} from "@/api/pecha";
import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { languages } from "@/utils/Constants";
import { Textarea } from "@/components/ui/textarea";

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
  readonly selectedPecha: string | null;
  readonly setSelectedPecha: (id: string | null) => void;
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
  return (
    <>
      <div className="mb-4">
        <div className="block mb-2">Type:</div>
        <RadioGroup
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
            onChange={(e) => {
              setSelectedPecha(e.target.value);
            }}
            className="w-full p-2 border rounded"
            value={selectedPecha || ""}
          >
            <option value="">Select a root document</option>
            {pechas?.metadata?.map((d: PechaMetadata) => (
              <option key={d.id} value={d.id}>
                {d.id} {d.title.bo}
              </option>
            ))}
          </select>
        )}
        {selectedPecha && <PechaView pechaId={selectedPecha} />}
      </div>
    </>
  );
}

function PechaView({ pechaId }: { pechaId: string }) {
  const {
    data: pecha,
    refetch,
    error,
    isPending,
  } = useQuery({
    queryKey: ["pecha", pechaId],
    queryFn: () => fetchPechaBase(pechaId),
  });
  useEffect(() => {
    refetch();
  }, [pechaId]);
  if (error) {
    return <div>Error: {error.message}</div>;
  }
  const contents = pecha?.bases
    ? Object.entries(pecha.bases).map(([key, value]) => ({
        id: key,
        content: value,
      }))
    : [];
  const content = contents.length > 0 ? (contents[0].content as string) : "";
  if (isPending) {
    return <div>Loading...</div>;
  }
  return content ? (
    <Textarea
      value={content}
      rows={10}
      onChange={() => {}}
      className="font-monlam"
    />
  ) : (
    <div>No content</div>
  );
}

export default SelectPechas;
