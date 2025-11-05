const API_ENDPOINT = process.env.OPENPECHA_ENDPOINT;

/**
 * Step 1: Fetch list of root expressions (title + id)
 * GET /texts?type=root
 */
async function getTexts(type) {
	let url = `${API_ENDPOINT}/texts`;
	if (type) {
		url += `?type=${type}`;
	}
	const response = await fetch(url, {
		headers: {
			accept: "application/json",
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch texts from openpecha: ${response.statusText}`);
	}

	const data = await response.json();
	return data;
}

/**
 * Step 3: Get list of available instances for a text
 * GET /texts/{text_id}/instances
 */
async function getTextInstances(text_id) {
	const response = await fetch(`${API_ENDPOINT}/texts/${text_id}/instances`, {
		headers: {
			accept: "application/json",
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch text instances from openpecha: ${response.statusText}`);
	}

	const data = await response.json();
	return data;
}

/**
 * Step 4: Fetch serialized text for translation
 * GET /instances/{instance_id}
 */
async function getInstanceContent(instanceId) {
	const response = await fetch(`${API_ENDPOINT}/instances/${instanceId}?annotation=true`, {
		headers: {
			accept: "application/json",
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch instance content from openpecha: ${response.statusText}`);
	}

	const data = await response.json();
	return data;
}

async function getAnnotations(annotation_id){
	const response = await fetch(`${API_ENDPOINT}/annotations/${annotation_id}`, {
		header: {
			accept: "application/json",
			"Content-Type": "applicaton/json"
		}
	})

	if(!response.ok){
		throw new Error(`Failed to fetch annotations from openpecha: ${response.statusText}`);
	}

	const data = await response.json();
	return data;
}
module.exports = {
	// New API flow functions
	getTexts,
	getTextInstances,
	getInstanceContent,
	getAnnotations,
};
