// See https://developers.google.com/apps-script/guides/properties
// for instructions on how to set the API key.
const apiKey = "AIzaSyAdCq93iaKJWXDOu-UzKo5DzYebMEnbdY4";

function main() {
  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 65536,
    responseMimeType: "text/plain",
  };

  const data = {
    generationConfig,
    contents: [
      {
        role: "user",
        parts: [{ text: "Hi" }],
      },
    ],
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-exp-03-25:generateContent?key=${apiKey}`;
  const options = {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify(data),
  };

  const response = UrlFetchApp.fetch(url, options);
  console.log(response.getContentText());
}
