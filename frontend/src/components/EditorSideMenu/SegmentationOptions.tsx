import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
	TooltipProvider,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface SegmentationOptionsProps {
	selectedMethod: "botok" | "newline";
	onMethodChange: (method: "botok" | "newline") => void;
}

const SegmentationOptions = ({
	selectedMethod,
	onMethodChange,
}: SegmentationOptionsProps) => {
	return (
		<div className="space-y-4">
			<label className="text-sm font-medium text-gray-700">
				Segmentation Options
			</label>
			<TooltipProvider>
				<RadioGroup
					value={selectedMethod}
					onValueChange={onMethodChange}
					className="pl-2 mt-2"
				>
					<div className="flex items-center space-x-3">
						<RadioGroupItem value="newline" id="newline" />
						<Label
							htmlFor="newline"
							className="text-sm text-gray-700 cursor-pointer"
						>
							Use source text segmentation
						</Label>
					</div>
					<div className="flex items-center space-x-3">
						<RadioGroupItem value="botok" id="botok" />
						<Label
							htmlFor="botok"
							className="text-sm text-gray-700 cursor-pointer"
						>
							Auto segmentation
						</Label>
						<Tooltip>
							<TooltipTrigger asChild>
								<Info className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-help" />
							</TooltipTrigger>
							<TooltipContent>
								<p>
									For Tibetan text that is not segmented. Enables word
									segmentation using the Botok tokenizer.
								</p>
							</TooltipContent>
						</Tooltip>
					</div>
				</RadioGroup>
			</TooltipProvider>
		</div>
	);
};

export default SegmentationOptions;
