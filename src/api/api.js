
const API_BASE_URL = "http://localhost:8080/api";

export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  return response.json();
}

export async function getOrganization() {
  const response = await fetch(`${API_BASE_URL}/organization`);

  if (!response.ok) {
    throw new Error(`Failed to fetch organization: ${response.status}`);
  }

  return response.json();
}