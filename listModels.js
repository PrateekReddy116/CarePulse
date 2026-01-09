
const API_KEY = 'AIzaSyAhZzxxVjHw0eLE4ZXOn5sYju9yGq2rKvw';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
    console.log('Listing Gemini Models...');
    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        if (data.models) {
            console.log('Available Models:');
            data.models.forEach(m => {
                if (m.name.includes('gemini')) {
                    console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
                }
            });
        } else {
            console.log('Response:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

listModels();
