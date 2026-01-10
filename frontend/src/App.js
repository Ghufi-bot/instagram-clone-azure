import React, { useEffect, useState } from "react";
import axios from "axios";

export default function App() {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState([]);

  const API_URL = "http://localhost:3000";

  // ✅ Fetch posts
  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API_URL}/posts`);
      setPosts(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // ✅ Upload post
  const handleUpload = async () => {
    if (!file) {
      alert("Please select an image");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("caption", caption);

    try {
      const res = await axios.post(`${API_URL}/upload`, formData);
      setMessage(res.data.message);
      setCaption("");
      setFile(null);

      // ✅ refresh posts after upload
      fetchPosts();
    } catch (err) {
      console.log(err);
      setMessage("Upload failed ❌");
    }
  };

  return (
    <div style={{ fontFamily: "Arial", padding: 20 }}>
      <h1 style={{ textAlign: "center" }}>📸 InstaClone</h1>

      {/* ✅ Upload Section */}
      <div
        style={{
          maxWidth: 400,
          margin: "auto",
          padding: 20,
          border: "1px solid #ddd",
          borderRadius: 10,
        }}
      >
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <br />
        <br />
        <input
          type="text"
          placeholder="Write caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          style={{ width: "100%", padding: 10 }}
        />
        <br />
        <br />
        <button
          onClick={handleUpload}
          style={{
            width: "100%",
            padding: 12,
            background: "black",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Upload ✅
        </button>
        <p style={{ marginTop: 10, color: "green" }}>{message}</p>
      </div>

      {/* ✅ Feed Section */}
      <div style={{ maxWidth: 500, margin: "40px auto" }}>
        <h2>📰 Feed</h2>

        {posts.length === 0 ? (
          <p>No posts yet...</p>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                marginBottom: 20,
                overflow: "hidden",
              }}
            >
              <img
                src={post.imageUrl}
                alt="post"
                style={{ width: "100%", height: "auto" }}
              />
              <div style={{ padding: 10 }}>
                <p>
                  <b>{post.caption}</b>
                </p>
                <small>{new Date(post.createdAt).toLocaleString()}</small>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
