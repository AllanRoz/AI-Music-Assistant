import React, { useState } from "react";
import { Button, Input, Typography, Upload, message } from "antd";
import {
  FileTextOutlined,
  EditOutlined,
  UploadOutlined,
} from "@ant-design/icons";

const { TextArea } = Input;
const { Title } = Typography;

function App() {
  const [showTextArea, setShowTextArea] = useState(false);
  const [showFileInput, setShowFileInput] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const [textInput, setTextInput] = useState("");

  const handleInsertText = () => {
    setShowTextArea(true);
    setShowFileInput(false);
  };

  const handleInsertFile = () => {
    setShowFileInput(true);
    setShowTextArea(false);
  };

  const handleTextChange = (e) => {
    setTextInput(e.target.value);
  };

  const handleFileChange = (info) => {
    if (info.file.status === "done") {
      message.success(`${info.file.name} file uploaded successfully`);
      if (info.file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFileContent(e.target.result);
        };
        reader.readAsText(info.file.originFileObj);
      } else {
        setFileContent(`Uploaded ${info.file.name} (non-text file)`);
      }
    } else if (info.file.status === "error") {
      message.error(`${info.file.name} file upload failed.`);
      setFileContent("");
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
    if (textInput || fileContent) {
      const dataToSend = {};
      if (textInput) {
        dataToSend.text = textInput;
      }
      if (fileContent) {
        dataToSend.file_content = fileContent;
      }

      try {
        const response = await fetch("/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSend),
        });

        if (response.ok) {
          message.success("Data sent to backend successfully!");
          setTextInput("");
          setFileContent("");
          setShowTextArea(false);
          setShowFileInput(false);
        } else {
          const errorData = await response.json();
          message.error(
            `Failed to send data: ${errorData.error || response.statusText}`
          );
        }
      } catch (error) {
        message.error(`Failed to connect to backend: ${error.message}`);
      }
    } else {
      message.warning("Please insert text or select a file before submitting.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 0,
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
          <Button icon={<FileTextOutlined />} onClick={handleInsertFile}>
            Insert TXT File
          </Button>
        </div>

        {showTextArea && (
          <div style={{ marginTop: 24 }}>
            <Title level={3}>Enter Text:</Title>
            <TextArea
              rows={27}
              value={textInput}
              onChange={handleTextChange}
              placeholder="Type your text here"
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

        <Button
          type="primary"
          size="large"
          onClick={handleSubmit}
          style={{ marginTop: 32 }}
        >
          Submit
        </Button>
      </div>
    </div>
  );
}

export default App;
