export function generateJsonFromText(inputText:string) {
    // Remove line breaks to create base_text
    const baseText = inputText.replace(/\n/g, ' ').replace(/\r/g, ''); // Removing line breaks

    // Split the inputText into lines based on line breaks
    const lines = inputText.split('\n');

    // Prepare annotations for alignment segmentation based on the lines
    const alignmentSegmentation: { segment: { start: number; end: number }; mapping: number[] }[] = [];
    let currentStart = 0;

    lines.forEach(line => {
        if (line.trim()) { // Ensure line is not empty
            // End position will be the start position + the length of the line
            const currentEnd = currentStart + line.length;
            const segment = {
                segment: {
                    start: currentStart,
                    end: currentEnd
                },
                mapping: [1] // Example mapping, you can modify this based on your needs
            };
            alignmentSegmentation.push(segment);
            currentStart = currentEnd + 1; // Ensure that the next segment starts after the current end, with space
        }
    });

    // Create the final JSON structure
    const result = {
        metadata: {},
        base_text: baseText,
        annotations: {
            alignment_segmentation: alignmentSegmentation
        }
    };

    // Return the JSON object stringified
    return JSON.stringify(result, null, 2);
}


