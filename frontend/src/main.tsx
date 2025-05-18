import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import Upload from "./Upload";
import Analysis from "./Analysis";
import Cookies from "js-cookie";

const App: React.FC = () => {
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  useEffect(() => {
    const id = Cookies.get("analysisId");
    if (id) {
      setAnalysisId(id);
    }
  }, []);

  const handleUploadSuccess = (id: string) => {
    setAnalysisId(id); // ID aus Upload direkt übernehmen
  };
  
  const backToUpload = () => {
    Cookies.set("analysisId",""); 
    setAnalysisId(null);
  }

  return (
    <React.StrictMode>
      {analysisId?.length > 0 ? <Analysis id={analysisId} backToUpload={backToUpload} /> : <Upload onUploadSuccess={handleUploadSuccess} />}
    </React.StrictMode>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(<App />);

