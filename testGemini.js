
const API_KEY = 'AIzaSyAhZzxxVjHw0eLE4ZXOn5sYju9yGq2rKvw';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

async function testGemini() {
    console.log('Testing Gemini API...');
    const prompt = "Say 'Hello from Gemini!' if you can hear me.";

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            console.error('API Error Status:', response.status);
            const text = await response.text();
            console.error('API Error Body:', text);
            return;
        }

        const data = await response.json();
        console.log('Success! Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

testGemini();
