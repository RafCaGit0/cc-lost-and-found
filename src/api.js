import { fetchAuthSession } from 'aws-amplify/auth';

const API_URL = import.meta.env.VITE_API_URL;

async function getHeaders() {
  try {
    // In Amplify v6, this gets the current valid session tokens automatically
    const session = await fetchAuthSession();
    return {
      'Authorization': session.tokens.idToken.toString(),
      'Content-Type': 'application/json'
    };
  } catch (err) {
    console.error("No active session", err);
    throw new Error("Authentication required");
  }
}

export async function getItems(postType) {
  const headers = await getHeaders();
  let url = `${API_URL}/items`;
  if (postType) {
    url += `?postType=${postType}`;
  }
  
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return res.json();
}

export async function createItem(data, imageFile) {
  const headers = await getHeaders();
  
  let imageKey = null;
  
  // Phase 1: Upload image to S3 if provided
  if (imageFile) {
    // 1a. Request pre-signed URL from our Lambda
    const urlRes = await fetch(`${API_URL}/items/upload-url`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ contentType: imageFile.type })
    });
    
    if (!urlRes.ok) throw new Error("Failed to get secure upload URL");
    const { uploadUrl, uploadFields, imageKey: newKey } = await urlRes.json();
    
    // 1b. Put the file directly into the S3 bucket using POST and FormData
    const formData = new FormData();
    Object.entries(uploadFields).forEach(([k, v]) => formData.append(k, v));
    formData.append("file", imageFile); // file must be the last field appended!
    
    const s3Res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });
    
    if (!s3Res.ok) throw new Error("Failed to upload image to S3");
    imageKey = newKey;
  }
  
  // Phase 2: Save the item data (with the imageKey and tags) to DynamoDB
  const payload = { ...data };
  if (imageKey) payload.imageKey = imageKey;
  
  const res = await fetch(`${API_URL}/items`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function resolveItem(id) {
  const headers = await getHeaders();
  const res = await fetch(`${API_URL}/items/${id}/resolve`, {
    method: 'POST',
    headers
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteItem(id) {
  const headers = await getHeaders();
  const res = await fetch(`${API_URL}/items/${id}`, {
    method: 'DELETE',
    headers
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateItem(id, data) {
  const payload = { ...data };

  const headers = await getHeaders();
  const res = await fetch(`${API_URL}/items/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getItem(id) {
  const headers = await getHeaders();
  const res = await fetch(`${API_URL}/items/${id}`, {
    headers
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getUsers() {
  const headers = await getHeaders();
  const res = await fetch(`${API_URL}/admin/users`, {
    headers
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function promoteUser(username) {
  const headers = await getHeaders();
  const res = await fetch(`${API_URL}/admin/promote`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ username })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function analyzeImage(base64Str) {
  const headers = await getHeaders();
  const res = await fetch(`${API_URL}/items/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ image: base64Str })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
