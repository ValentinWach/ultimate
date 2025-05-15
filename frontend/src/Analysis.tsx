import React, { useEffect, useState } from "react";
import axios from "axios";
import Checklist, { ChecklistItem } from "./Checklist";
import { mapEasingToNativeEasing } from "framer-motion";

type Category = "fehlend" | "unusual" | "invalid" | "valid" | "match_found" | "";

interface AnalysisItem {
    text: string;
    category: Category[];
    description: string;
    id: string;
}

interface AnalysisResponse {
    id: string;
    results: AnalysisItem[];
    essentials: AnalysisEssenstials;
}

interface AnalysisEssenstials {
    vertragsparteien: string;
    mietgegenstand: string;
    miete: string;
    mietbeginn: string;
}

const mockData: AnalysisResponse = {
    id: "mock-id",
    results: [
        {
            text: "Der Mieter darf die Mieträume nur zu Wohnzwecken nutzen.",
            category: ["unusual"],
            description: "Einschränkung der Nutzung ungewöhnlich restriktiv.",
            id: "1",
        },
        {
            text: "Der Vertrag verlängert sich automatisch um weitere 12 Monate.",
            category: ["invalid"],
            description: "Automatische Verlängerungsklausel mit ungewöhnlich langer Dauer.",
            id: "2"
        },
        {
            text: "Keine Haustiere erlaubt.",
            category: ["fehlend"],
            description: "Fehlt eine Ausnahmegenehmigung für Kleintiere.",
            id: "3"
        },
    ],
    essentials: { vertragsparteien: "", mietgegenstand: "", miete: "", mietbeginn: "" }
};

interface AnalysisProps {
    id: string;
    backToUpload: () => void;
}

const Analysis: React.FC<AnalysisProps> = ({ id, backToUpload }) => {
    const [fullText, setFullText] = useState<string>("");
    const [findings, setFindings] = useState<AnalysisItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
    const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null); // Neues State für die Auswahl
    const [showChecklist, setShowChecklist] = useState(true);
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[] | null>([]);


    const fetchAnalysis = async (analysisId: string) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await axios.get<AnalysisResponse>(`${apiUrl}/api/analysis/${analysisId}`);
            response.data.results.forEach((f, idx) => {
                f.id = `finding-${idx + 1}`;
            });
            setFullText(highlightText(response.data.results));
            setFindings(response.data.results);
            setChecklistItems([
                { "title": "Vertragsparteien / Parties' involved", completed: response.data.essentials.vertragsparteien != null, "description": response.data.essentials.vertragsparteien ?? "------" },
                { "title": "Mietgegenstand, Nutzungszweck / Leased property, intended use, ", completed: response.data.essentials.mietgegenstand != null, "description": response.data.essentials.mietgegenstand ?? "------" },
                { "title": "Miete / Rent", completed: response.data.essentials.miete != null, "description": response.data.essentials.miete ?? "------" },
                { "title": "Mietbeginn / Start of lease", completed: response.data.essentials.mietbeginn != null, "description": response.data.essentials.mietbeginn ?? "------" },

            ]);
        } catch (error) {
            console.error("Error fetching analysis, using mock data:", error);
            setFindings(mockData.results);
        }
    };

    useEffect(() => {
        const analysisId = id;
        fetchAnalysis(analysisId);
    }, [id, selectedFindingId, selectedCategory]);

    const getCategory = (categories: Category[]): Category | null => {
        if (categories.includes("invalid")) return "invalid";
        else if (categories.includes("unusual")) return "unusual";
        else return null;
    }

    const getUserStringFrom = (Category): string => {
        if (Category == "invalid") return "POTENTIALLY INVALID"
        else if (Category == "unusual") return "NOT COMMON"
        return "";
    }

    const getColorForCategory = (category: Category): string => {
        switch (category) {
            case "fehlend":
                return "red";
            case "unusual":
                return "yellow";
            case "invalid":
                return "red";
            case "valid":
                return "";
            case "match_found":
                return "";
            default:
                return "";
        }
    };

    const highlightText = (findings: AnalysisItem[]): string => {
        let highlightedText = "";

        findings.forEach((finding) => {
            const isSelected = finding.id === selectedFindingId;
            const opacity = isSelected ? 1 : 1;
            const category = getCategory(finding.category) ?? "";
            const color = getColorForCategory(category);
            const mark_yellow = color == "yellow" && (selectedCategory == null || selectedCategory == "all" || selectedCategory == category);
            const mark_red = color == "red" && (selectedCategory == null || selectedCategory == "all" || selectedCategory == category);
            highlightedText += `<span id="finding-${finding.id}" class="${isSelected ? "highlighted" : ""} ${mark_yellow ? "marked_yellow" : ""} ${mark_red ? "marked_red" : ""}">${finding.text.replace("\n", "<br/>")} </span>`;
        });

        return highlightedText;
    };

    const handleFindingClick = (findingId: string) => {
        setSelectedFindingId(findingId);
        const element = document.getElementById(`finding-${findingId}`);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    };

    const filteredFindings = selectedCategory === "all"
        ? findings.filter(f => getCategory(f.category) != null)
        : findings.filter(f => getCategory(f.category) === selectedCategory);

    return (
        <div style={styles.outerContainer}>
            <button style={styles.backButton} onClick={backToUpload}>
                ←
            </button>
            <div style={styles.main}>

                <h1 style={styles.title}>ULTIMATE</h1>

                <div style={styles.container}>
                    <div style={styles.documentContainer}>
                        <div style={styles.subheader}>Your Rental Agreement</div>
                        <div
                            style={styles.document}
                            dangerouslySetInnerHTML={{ __html: fullText }}
                        />
                    </div>

                    <div style={styles.sidebar}>
                        <div style={styles.buttonGroup}>
                            <button onClick={() => {setSelectedCategory("unusual");setSelectedFindingId(null)}} style={styles.button} className={selectedCategory == "unusual" ? "highlighted_c" : ""}>
                                🤔<br />Check
                            </button>
                            <button onClick={() => {setSelectedCategory("invalid");setSelectedFindingId(null)}} style={styles.button} className={selectedCategory == "invalid" ? "highlighted_c" : ""}>
                                ❌<br />Invalid
                            </button>
                        </div>

                        <div style={styles.findingsList}>
                            {filteredFindings.map((finding, idx) => (
                                <div
                                    key={idx}
                                    style={styles.findingBox}
                                    className={finding.id == selectedFindingId ? "highlighted" : ""}
                                    onClick={() => handleFindingClick(finding.id)}
                                >
                                    <strong>{getUserStringFrom(getCategory(finding.category))?.toUpperCase() ?? ""}</strong>
                                    <p>{finding.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="h-screen w-screen bg-white">
                {showChecklist && (
                    <Checklist
                        checklistItems={checklistItems}
                        onClose={() => setShowChecklist(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default Analysis;

const styles: { [key: string]: React.CSSProperties } = {
    outerContainer: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
    },
    main: {
        fontFamily: "Lexend, sans-serif",
        backgroundColor: "#17002E",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        paddingTop: "4vh"
    },
    title: {
        fontFamily: "Lexend Mega, sans-serif",
        fontSize: "45px",
        color: "#F25D00",
        textAlign: "center",
        margin: "0",
        paddingTop: "2vh",
        paddingBottom: "4vh"
    },
    subheader: {
        fontFamily: "Lexend, sans-serif",
        fontSize: "35px",
        color: "#ffffff",
        textAlign: "center",
        margin: "0",
        paddingTop: "20px",
    },
    subtitle: {
        fontFamily: "Lexend, sans-serif",
        fontSize: "15px",
        color: "#ffffff",
        textAlign: "center",
        margin: "0",
        padding: "0px",
    },
    container: {
        flex: 1,
        display: "flex",
        overflow: "hidden",
        paddingTop: "20px"
    },
    documentContainer: {
        flex: 3,
        fontSize: "18px",
        lineHeight: "1.8",
        margin: "20px",
        marginRight: "30px",
        borderRadius: "25px",
        backgroundColor: "#ffffff50",
        height: "70vh",
        overflowY: "auto"
    },
    document: {
        padding: "40px",
        color: "#ffffff",
        boxSizing: "border-box",
    },
    sidebar: {
        flex: 1,
        padding: "20px",
        backgroundColor: "#ffffff50",
        borderRadius: "25px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        margin: "20px",
        height: "70vh",
        overflowY: "auto"
    },
    buttonGroup: {
        display: "flex",
        flexWrap: "wrap",
        width: "100%",
    },
    button: {
        width: "45%",
        aspectRatio: "1 / 1",
        border: "none",
        backgroundColor: "#ffffff",
        color: "#000000",
        borderRadius: "8px",
        cursor: "pointer",
        lineHeight: "1.5",
        fontSize: "20px",
        fontWeight: "bold",
        margin: "1%",
        padding: "0",
    },
    findingsList: {
        marginTop: "20px",
        overflowY: "auto",
        flex: 1,
    },
    findingBox: {
        backgroundColor: "#ffffff70",
        padding: "12px",
        borderRadius: "8px",
        marginBottom: "10px",
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
        cursor: "pointer",
    },
    backButton: {
        position: "absolute",
        top: "20px",
        left: "20px",
        width: "50px",
        height: "50px",
        borderRadius: "50%",
        backgroundColor: "#F25D00",
        color: "white",
        border: "none",
        fontSize: "24px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 250,
    },
    checklist: {
        position: "absolute",
        top: "20px",
        right: "20px",
        width: "50px",
        height: "50px",
        borderRadius: "50%",
        backgroundColor: "#F25D00",
        color: "white",
        border: "none",
        fontSize: "24px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 250,
    },
};
