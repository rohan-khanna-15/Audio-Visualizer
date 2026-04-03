/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backend = "http://localhost:3001";
    return [
      { source: "/login", destination: `${backend}/login` },
      { source: "/register", destination: `${backend}/register` },
      { source: "/users", destination: `${backend}/users` },
      { source: "/upload", destination: `${backend}/upload` },
      { source: "/files", destination: `${backend}/files` },
      { source: "/analytics", destination: `${backend}/analytics` },
      { source: "/sessions", destination: `${backend}/sessions` },
      { source: "/presets", destination: `${backend}/presets` },
      { source: "/presets/:id", destination: `${backend}/presets/:id` },
      { source: "/user/:username", destination: `${backend}/user/:username` },
      { source: "/file/:filename", destination: `${backend}/file/:filename` },
      { source: "/media/:filename", destination: `${backend}/media/:filename` }
    ];
  }
};

export default nextConfig;
