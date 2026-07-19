# Krishi Clinic Lite

Crop Disease Advisory Dashboard (GramIQ Full Stack Dev Intern Assignment).

## Setup
1. Clone the repository.
2. Ensure you have Docker and Docker Compose installed.
3. Configure your environment variables in `backend/.env`:
```
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
4. Run `docker compose up -d` to build and start the containers.
5. The frontend will be available at `http://localhost:3000`.
