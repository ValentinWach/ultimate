import React, { useState, ChangeEvent } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Home } from "lucide-react";

interface UploadProps {
    onUploadSuccess: (id: string) => void;
}

const Upload: React.FC<UploadProps> = ({ onUploadSuccess }) => {

    const [fileName, setFileName] = useState<string>("");
    const [uploading, setUploading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        const allowedTypes = [
            "application/pdf",
            "application/msword", // .doc
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        ];

        if (allowedTypes.includes(file.type)) {
            setFileName(file.name);
            await uploadFile(file);
        } else {
            alert("Please upload a PDF; DOC or DOCX file.");
        }
    };

    const uploadFile = async (file: File) => {
        try {
            setUploading(true);
            setError("");
            const formData = new FormData();
            formData.append("file", file);
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await axios.post(`${apiUrl}/api/upload`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            const data = response.data;
            if (data?.id) {
                Cookies.set("analysisId", data.id);  // Cookie setzen
                onUploadSuccess(data.id);             // Richtige ID übergeben
            } else {
                setError("Upload succeeded, but no ID returned.");
            }
        } catch (err) {
            console.error(err);
            setError("An error occurred during upload.");
        } finally {
            setUploading(false);
        }
    };


    const triggerFileInput = () => {
        const fileInput = document.getElementById("fileInput") as HTMLInputElement;
        fileInput?.click();
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>ULTIMATE</h1>
            <p style={styles.subtitle}>Rent smart, not hard!</p>

            <div style={styles.uploadBox} onClick={triggerFileInput}>
                <div style={styles.document}>
                    <div style={styles.uploadCircle}>
                        <span style={styles.arrow}>↑</span>
                    </div>
                    <div style={styles.lines}>
                        <div style={styles.line}></div>
                        <div style={styles.line}></div>
                        <div style={styles.line}></div>
                        <div style={styles.line}></div>
                    </div>
                    <br/>
                    <Home size={40} className="text-blue-500" />
                </div>
            </div>

            <input
                id="fileInput"
                type="file"
                accept=".pdf, .doc, .docx, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                style={{ display: "none" }}
                onChange={handleFileChange}
            />

            <button style={styles.uploadButton} onClick={triggerFileInput}>
                Upload
            </button>

            {fileName && <p style={styles.fileName}>{fileName}</p>}
            {error && <p style={styles.error}>{error}</p>}

            {uploading && (
                <div style={styles.overlay}>
                    <div style={styles.spinner}></div>
                </div>
            )}
        </div>
    );
};

export default Upload;

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        fontFamily: "Lexend, sans-serif",
        minHeight: "100vh",
        backgroundColor: "#17002E",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative", // wichtig für overlay
    },
    title: {
        fontFamily: "Lexend Mega, sans-serif",
        fontSize: "36px",
        color: "#F25D00",
        margin: "5px",
        fontWeight: "500",
    },
    subtitle: {
        marginTop: "10px",
        marginBottom: "30px",
        color: "#ffffff",
        fontSize: "18px",
    },
    uploadBox: {
        backgroundColor: "#e7e8e9",
        borderRadius: "15px",
        padding: "40px",
        cursor: "pointer",
    },
    document: {
        backgroundColor: "#fff",
        borderRadius: "15px",
        padding: "30px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "180px",
        height: "220px",
        justifyContent: "center",
        position: "relative",
    },
    uploadCircle: {
        backgroundColor: "#F25D00",
        borderRadius: "50%",
        width: "50px",
        height: "50px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "20px",
    },
    arrow: {
        fontSize: "24px",
        color: "#ffffff",
    },
    lines: {
        width: "80%",
    },
    line: {
        height: "2px",
        backgroundColor: "#000",
        margin: "8px 0",
    },
    uploadButton: {
        marginTop: "30px",
        backgroundColor: "#F25D00",
        color: "#fff",
        border: "none",
        padding: "12px 24px",
        fontSize: "16px",
        borderRadius: "8px",
        cursor: "pointer",
        width: "200px",
    },
    fileName: {
        marginTop: "20px",
        color: "#ffffff",
        fontSize: "14px",
    },
    error: {
        marginTop: "10px",
        color: "red",
        fontSize: "14px",
    },
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(23, 0, 46, 0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    spinner: {
        border: "6px solid #f3f3f3",
        borderTop: "6px solid #F25D00",
        borderRadius: "50%",
        width: "60px",
        height: "60px",
        animation: "spin 1s linear infinite",
    },

};
