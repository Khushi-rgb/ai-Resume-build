import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../configs/api";
import toast from "react-hot-toast";
import pdfToText from "react-pdftotext";
import mammoth from "mammoth";
const ATS = () => {
  const { token } = useSelector((state) => state.auth);

  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState("");
  const [uploadedResume, setUploadedResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [atsResult, setAtsResult] = useState(null);
const [loading, setLoading] = useState(false);
  const loadResumes = async () => {
    try {
      const { data } = await api.get("/api/users/resumes", {
        headers: {
          Authorization: token,
        },
      });

      setResumes(data.resumes);
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    if (token) {
      loadResumes();
    }
  }, [token]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or DOCX file.");
      return;
    }

    setUploadedResume(file);
    setSelectedResume("");
  };

  const handleCheckATS = async () => {
  try {
    if (!uploadedResume && !selectedResume) {
      toast.error("Please upload or select a resume");
      return;
    }

    if (!jobDescription.trim()) {
      toast.error("Please enter a job description");
      return;
    }

    setLoading(true);

    let resumeText = "";

    // Resume uploaded from computer
    if (uploadedResume) {
  if (uploadedResume.type === "application/pdf") {
    resumeText = await pdfToText(uploadedResume);
  } else if (
    uploadedResume.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const arrayBuffer = await uploadedResume.arrayBuffer();

    const result = await mammoth.extractRawText({
      arrayBuffer,
    });

    resumeText = result.value;
  }
}

    // Resume selected from saved resumes
    else if (selectedResume) {
      const { data } = await api.get(
        `/api/resumes/get/${selectedResume}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      const resume = data.resume || data;

      resumeText = `
        ${resume.personal_info?.full_name || ""}
        ${resume.personal_info?.profession || ""}
        ${resume.personal_info?.email || ""}
        ${resume.personal_info?.phone || ""}
        ${resume.personal_info?.location || ""}
        ${resume.personal_info?.linkedin || ""}

        PROFESSIONAL SUMMARY:
        ${resume.professional_summary || ""}

        SKILLS:
        ${(resume.skills || []).join(", ")}

        EXPERIENCE:
        ${(resume.experience || [])
          .map(
            (exp) => `
            Company: ${exp.company || ""}
            Position: ${exp.position || ""}
            Duration: ${exp.start_date || ""} - ${exp.end_date || ""}
            Description: ${exp.description || ""}
          `
          )
          .join("\n")}

        PROJECTS:
        ${(resume.project || [])
          .map(
            (project) => `
            Project: ${project.name || ""}
            Type: ${project.type || ""}
            Description: ${project.description || ""}
          `
          )
          .join("\n")}

        EDUCATION:
        ${(resume.education || [])
          .map(
            (edu) => `
            Institution: ${edu.institution || ""}
            Degree: ${edu.degree || ""}
            Field: ${edu.field || ""}
            Graduation: ${edu.graduation_date || ""}
            GPA: ${edu.gpa || ""}
          `
          )
          .join("\n")}
      `;
    }

    // Send resume + job description to backend
    const { data } = await api.post(
      "/api/ai/ats-score",
      {
        resumeText,
        jobDescription,
      },
      {
        headers: {
          Authorization: token,
        },
      }
    );

    setAtsResult(data);

    toast.success("ATS analysis completed!");
  } catch (error) {
    console.error(error);

    toast.error(
      error.response?.data?.message || "Failed to analyze resume"
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-3xl font-bold text-slate-800">
          ATS Resume Analyzer
        </h1>

        <p className="text-slate-500 mt-2">
          Check how well your resume matches a job description.
        </p>

        <div className="bg-white rounded-xl shadow-sm border mt-8 p-6">

          <h2 className="text-xl font-semibold text-slate-800">
            Choose Your Resume
          </h2>

          <label className="block mt-4 text-sm font-medium text-slate-600">
            Upload Resume from Computer
          </label>

          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            className="w-full mt-2 p-3 border border-slate-300 rounded-lg"
          />

          {uploadedResume && (
            <p className="text-sm text-green-600 mt-2">
              Selected: {uploadedResume.name}
            </p>
          )}

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-sm text-slate-400">OR</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          <label className="block text-sm font-medium text-slate-600">
            Select from Saved Resumes
          </label>

          <select
            value={selectedResume}
            onChange={(e) => {
              setSelectedResume(e.target.value);
              setUploadedResume(null);
            }}
            className="w-full mt-2 p-3 border border-slate-300 rounded-lg outline-none focus:border-green-500"
          >
            <option value="">Select a saved resume</option>

            {resumes.map((resume) => (
              <option key={resume._id} value={resume._id}>
                {resume.title}
              </option>
            ))}
          </select>

          <h2 className="text-xl font-semibold text-slate-800 mt-8">
            Job Description
          </h2>

          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
            className="w-full h-56 mt-4 p-4 border border-slate-300 rounded-lg outline-none focus:border-green-500 resize-none"
          />

          <button
            onClick={handleCheckATS}
            className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
           {loading ? "Analyzing..." : "Check ATS Score"}
          </button>
          {atsResult && (
  <div className="mt-8 border-t pt-6">

   <div className="text-center mb-8">
  <h2 className="text-2xl font-bold text-slate-800">
    Overall ATS Score
  </h2>

  <div className="mt-4 flex justify-center">
  <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-8 border-green-500">
    <div className="text-center">
      <div className="text-4xl font-bold text-green-600">
        {atsResult.score}
      </div>

      <div className="text-sm text-slate-500">
        out of 100
      </div>
    </div>
  </div>
</div>

  <p className="text-slate-500 mt-2">
    Overall resume match with the job description
  </p>
</div>
   <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">

  <div className="p-4 bg-slate-50 rounded-lg border">
    <p className="text-sm text-slate-500">
      Keyword Matching
    </p>
    <p className="text-2xl font-bold text-slate-800 mt-1">
      {atsResult.breakdown?.keywordMatching || 0}/70
    </p>
  </div>

  <div className="p-4 bg-slate-50 rounded-lg border">
    <p className="text-sm text-slate-500">
      Section Completeness
    </p>
    <p className="text-2xl font-bold text-slate-800 mt-1">
      {atsResult.breakdown?.sectionCompleteness || 0}/20
    </p>
  </div>

  <div className="p-4 bg-slate-50 rounded-lg border">
    <p className="text-sm text-slate-500">
      Content Quality
    </p>
    <p className="text-2xl font-bold text-slate-800 mt-1">
      {atsResult.breakdown?.contentQuality || 0}/10
    </p>
  </div>

</div>

    <div className="mt-6">
      <h3 className="font-semibold text-slate-700">
        Matched Keywords
      </h3>

      <div className="flex flex-wrap gap-2 mt-2">
        {atsResult.matchedKeywords?.map((keyword, index) => (
          <span
            key={index}
            className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>

    <div className="mt-6">
      <h3 className="font-semibold text-slate-700">
        Missing Keywords
      </h3>

      <div className="flex flex-wrap gap-2 mt-2">
        {atsResult.missingKeywords?.map((keyword, index) => (
          <span
            key={index}
            className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>

    <div className="mt-6">
      <h3 className="font-semibold text-slate-700">
        Suggestions
      </h3>

      <ul className="mt-2 space-y-3">
  {atsResult.suggestions?.map((suggestion, index) => (
    <li
      key={index}
      className="text-slate-600 text-sm"
    >
      {typeof suggestion === "string" ? (
        <>• {suggestion}</>
      ) : (
        <div className="bg-slate-50 border rounded-lg p-4 space-y-2">
          <p>
            <strong>What is missing or weak:</strong>{" "}
            {suggestion["What is missing or weak"]}
          </p>

          <p>
            <strong>Where to improve:</strong>{" "}
            {suggestion["Where it should be improved"]}
          </p>

          <p>
            <strong>How to improve:</strong>{" "}
            {suggestion["How the candidate can improve it"]}
          </p>
        </div>
      )}
    </li>
  ))}
</ul>
    </div>

    <div className="mt-6">
      <h3 className="font-semibold text-slate-700">
        ATS Issues
      </h3>

      <ul className="mt-2 space-y-2">
        {atsResult.atsIssues?.map((issue, index) => (
          <li
            key={index}
            className="text-slate-600 text-sm"
          >
            • {issue}
          </li>
        ))}
      </ul>
    </div>

  </div>
)}
         
        </div>
      </div>
    </div>
  );
};


export default ATS;