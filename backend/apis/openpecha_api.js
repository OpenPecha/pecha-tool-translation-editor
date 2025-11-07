const API_ENDPOINT = process.env.OPENPECHA_ENDPOINT;

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

const uploadTranslationToOpenpecha = async (instanceId, translationData) => {
	const response = await fetch(`${API_ENDPOINT}/instances/${instanceId}/translation`, {
		method: "POST",
		headers: {
			accept: "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify(translationData),
	});

	if (!response.ok) {
		throw new Error(`Failed to upload translation to openpecha: ${response.statusText}`);
	}

	const data = await response.json();
	return data;
};

module.exports = {
	getTexts,
	getTextInstances,
	getInstanceContent,
	getAnnotations,
	uploadTranslationToOpenpecha,
};
