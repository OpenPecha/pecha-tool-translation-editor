import React, { useEffect, useState } from "react";

const AvatarWrapper = ({ imageUrl, name, size = 32 }) => {
  const [src, setSrc] = useState(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const cacheKey = `avatar-${imageUrl}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      setSrc(cached);
    } else {
      fetch(imageUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch image");
          return res.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          sessionStorage.setItem(cacheKey, url);
          setSrc(url);
        })
        .catch(() => {
          setHasError(true);
        });
    }
  }, [imageUrl]);

  const getInitials = (name: string) => {
    return name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "?";
  };

  const style = {
    width: size,
    height: size,
    borderRadius: "50%",
    backgroundColor: "#ccc",
    fontSize: size / 2.5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: "bold",
    userSelect: "none",
    overflow: "hidden",
  };

  if (hasError || !src) {
    return <div style={style}>{getInitials(name)}</div>;
  }

  return <img src={src} alt={name} style={{ ...style, objectFit: "cover" }} />;
};

export default AvatarWrapper;
