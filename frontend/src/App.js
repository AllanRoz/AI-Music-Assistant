import React, { useState } from "react";
import { Button, Input, Typography, Upload, message } from "antd";
import {
  FileTextOutlined,
  EditOutlined,
  UploadOutlined,
  LinkOutlined,
} from "@ant-design/icons";

const { TextArea } = Input;
const { Title } = Typography;

function App() {
  const [showTextArea, setShowTextArea] = useState(false);
  const [showFileInput, setShowFileInput] = useState(false);
  const [showSpotifyInput, setShowSpotifyInput] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const [textInput, setTextInput] = useState("");
  const [spotifyLink, setSpotifyLink] = useState("");
  const [organizedSongs, setOrganizedSongs] = useState(null);
  const [loading, setLoading] = useState(false);
  // const [fileName, setFileName] = useState("");

  const handleInsertText = () => {
    setShowTextArea(true);
    setShowFileInput(false);
    setShowSpotifyInput(false);
    setOrganizedSongs(null);
  };

  const handleInsertFile = () => {
    setShowFileInput(true);
    setShowTextArea(false);
    setShowSpotifyInput(false);
    setOrganizedSongs(null);
  };

  const handleInsertSpotifyLink = () => {
    setShowSpotifyInput(true);
    setShowTextArea(false);
    setShowFileInput(false);
    setOrganizedSongs(null);
  };

  const handleTextChange = (e) => {
    setTextInput(e.target.value);
  };

  const handleSpotifyLinkChange = (e) => {
    setSpotifyLink(e.target.value);
  };

  const handleFileChange = (info) => {
    const file = info.file.originFileObj;
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  const beforeUpload = (file) => {
    const isTxt = file.type === "text/plain";
    if (!isTxt) {
      message.error("You can only upload .txt files!");
    }
    return isTxt || Upload.LIST_IGNORE;
  };

  const handleSubmit = async () => {
    if (textInput || fileContent || spotifyLink) {
      setLoading(true);
      const dataToSend = {};
      let endpoint = "";
      if (spotifyLink) {
        dataToSend.link = spotifyLink;
        endpoint = "/organize/playlist";
      } else if (textInput) {
        dataToSend.text = textInput;
        endpoint = "/organize/text";
      } else if (fileContent) {
        dataToSend.text = fileContent;
        endpoint = "/organize/text";
      }

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSend),
        });

        if (response.ok) {
          message.success("Songs organized successfully!");
          const organizedData = await response.json();
          console.log(organizedData);
          setOrganizedSongs(organizedData);
          setTextInput("");
          setFileContent("");
          setSpotifyLink("");
          setShowTextArea(false);
          setShowFileInput(false);
          setShowSpotifyInput(false);
        } else {
          const errorData = await response.json();
          message.error(
            `Failed to organize songs: ${
              errorData.error || response.statusText
            }`
          );
          setOrganizedSongs(null);
        }
      } catch (error) {
        message.error(`Failed to connect to backend: ${error.message}`);
        setOrganizedSongs(null);
      } finally {
        setLoading(false);
      }
    } else {
      message.warning(
        "Please insert text, select a file, or enter a Spotify link before submitting."
      );
      setOrganizedSongs(null);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        // paddingTop: 32,
      }}
    >
      <div style={{ width: "80%", maxWidth: "600px", textAlign: "center" }}>
        <Title level={1}>AI Music Assistant</Title>
        <div style={{ marginBottom: 16 }}>
          <Button
            icon={<EditOutlined />}
            onClick={handleInsertText}
            style={{ marginRight: 8 }}
          >
            Insert Text
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={handleInsertFile}
            style={{ marginRight: 8 }}
          >
            Insert TXT File
          </Button>
          <Button icon={<LinkOutlined />} onClick={handleInsertSpotifyLink}>
            Spotify Link
          </Button>
        </div>

        {showTextArea && (
          <div style={{ marginTop: 24 }}>
            <Title level={3}>Enter Text:</Title>
            <TextArea
              rows={27}
              value={textInput}
              onChange={handleTextChange}
              placeholder="Enter song name and artist (one per line, e.g., Song Name - Artist)"
            />
          </div>
        )}

        {showFileInput && (
          <div style={{ marginTop: 24 }}>
            <Title level={3}>Select a TXT File:</Title>
            <Upload
              name="file"
              listType="picture"
              className="upload-list-inline"
              showUploadList={false}
              beforeUpload={beforeUpload}
              onChange={handleFileChange}
            >
              <Button icon={<UploadOutlined />}>Click to Upload</Button>
            </Upload>
            {fileContent && (
              <div style={{ marginTop: 16 }}>
                <Title level={4}>File Content:</Title>
                <div
                  style={{
                    border: "1px solid #d9d9d9",
                    borderRadius: 4,
                    padding: 12,
                    backgroundColor: "#f5f5f5",
                    whiteSpace: "pre-wrap",
                    textAlign: "left",
                  }}
                >
                  {fileContent}
                </div>
              </div>
            )}
          </div>
        )}

        {showSpotifyInput && (
          <div style={{ marginTop: 24 }}>
            <Title level={3}>Enter Spotify Playlist Link:</Title>
            <Input
              placeholder="https://open.spotify.com/playlist/..."
              value={spotifyLink}
              onChange={handleSpotifyLinkChange}
            />
          </div>
        )}

        <Button
          type="primary"
          size="large"
          onClick={handleSubmit}
          style={{ marginTop: 32 }}
          loading={loading}
        >
          Organize Songs
        </Button>

        {organizedSongs && Object.keys(organizedSongs).length > 0 && (
          <div style={{ marginTop: 32, width: "100%", textAlign: "left" }}>
            {Object.entries(organizedSongs).map(([genre, songs]) => (
              <div key={genre} style={{ marginBottom: 16 }}>
                <Title level={3}>{genre.toUpperCase()}</Title>
                <ul>
                  {genre === "organized songs"
                    ? // Custom rendering for "organized songs"
                      songs.map(([subGenre, subSongs], index) => (
                        <li key={index}>
                          <strong>{subGenre}:</strong>
                          <ul>
                            {subSongs.map((song, subIndex) => (
                              <li key={subIndex}>{song}</li>
                            ))}
                          </ul>
                        </li>
                      ))
                    : // Normal rendering
                      songs.map((song, index) => <li key={index}>{song}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {organizedSongs &&
          Object.keys(organizedSongs).length === 0 &&
          !loading && (
            <div
              style={{
                marginTop: 32,
                width: "100%",
                textAlign: "center",
                color: "gray",
              }}
            >
              <Typography.Paragraph>
                No songs found or could be classified.
              </Typography.Paragraph>
            </div>
          )}
      </div>
    </div>
  );
}

export default App;
