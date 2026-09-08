  // controller for enhancing a resume's professional summary

import Resume from "../models/Resume.js";
import ai from "../configs/ai.js";
// POST: /api/ai/enhance-pro-sum
export const enhanceProfessionalSummary = async (req, res) => {
  try {
    const { userContent } = req.body;

    if (!userContent) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

const response=    await ai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
       { role: "system", content: "You are an expert in resume writing. Your task is to enhance the professional summary of a resume. The summary should be 1-2 sentences also highlighting key skills, experience, and career objectives. Make it compelling and ATS-friendly, and only return text no options or anything else." },
          {
       role: "user",
          content: userContent,
        },
      ],
    })
    const enhancedContent = response.choices[0].message.content;
    return res.status(200).json({enhancedContent})
  } catch(error){
    return res.status(400).json({message:error.message})
  }
}

 // controller for enhancing a resume's job description
// POST: /api/ai/enhance-job-desc
export const enhanceJobDescription = async (req, res) => {
  try {
    const { userContent } = req.body;

    if (!userContent) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

const response=    await ai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
       { role: "system", 
      content: "You are an expert in resume writing. Your task is to enhance the job description of a resume. The job description should be only in 1-2 sentence also highlighting key responsibilities and achievements. Use action verbs and quantifiable results where possible. Make it ATS-friendly. and only return text no options or anything else." },
          {
       role: "user",
          content: userContent,
        },
      ],
    })
    const enhancedContent = response.choices[0].message.content;
    return res.status(200).json({enhancedContent})
  } catch(error){
    return res.status(400).json({message:error.message})
  }
}

//controller for uploading a resume to the database
// POST: /api/ai/upload-resume
export const uploadResume = async (req, res) => {
  try {
   const { resumeText, title } = req.body;
const userId = req.userId;

if (!resumeText) {
  return res.status(400).json({ message: 'Missing required fields' });
}

const systemPrompt = "You are an expert AI Agent to extract data from resume."

const userPrompt = `extract data from this resume: ${resumeText}
Provide data in the following JSON format with no additional text before or
after:
{
  professional_summary: {type: String, default: '' },
    skills: [{type: String }],
    personal_info: {
        image: {type: String, default: '' },
        full_name: {type: String, default: '' },
        profession: {type: String, default: '' },
        email: {type: String, default: '' },
        phone: {type: String, default: '' },
        location: {type: String, default: '' },
        linkedin: {type: String, default: '' },
        website: {type: String, default: '' },
    },

    experience: [
    {
        company: { type: String },
        position: { type: String },
        start_date: { type: String },
        end_date: { type: String },
        description: { type: String },
        is_current: { type: Boolean },
    }
],

project: [
    {
        name: { type: String },
        type: { type: String },
        description: { type: String },
    }
],
education: [
    {
        institution: { type: String },
        degree: { type: String },
        field: { type: String },
        graduation_date: { type: String },
        gpa: { type: String },
    }
],
}

`;


const response= await ai.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
       { role: "system", 
      content: systemPrompt },
          {
       role: "user",
          content: userPrompt,
        },
      ],
      response_format:{type:'json_object'}
    })
    const extractedData = response.choices[0].message.content;
    const parsedData= JSON.parse( extractedData)
    const newResume= await Resume.create({userId,title, ...parsedData})
     res.json({resumeId: newResume._id})
  } catch(error){
    return res.status(400).json({message:error.message})
  }
}
// POST: /api/ai/ats-score
// POST: /api/ai/ats-score
export const analyzeATS = async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        message: "Resume and job description are required",
      });
    }

    const systemPrompt = `
You are an expert ATS resume analyzer.

Analyze the resume against the job description.

Return ONLY valid JSON in exactly this format:

{
  "requiredKeywords": [],
  "matchedKeywords": [],
  "missingKeywords": [],
  "suggestions": [],
  "atsIssues": []
}

Rules:

- requiredKeywords must contain 8 to 15 of the MOST IMPORTANT keywords
  from the job description.

- Focus on technical skills, technologies, tools, frameworks,
  programming languages, job titles and important responsibilities.

- Do not include generic words such as "teamwork", "communication",
  "hardworking", "passionate", "professional", or "problem-solving"
  unless they are explicitly important requirements of the job.

- matchedKeywords must contain only important keywords that are
  genuinely present in the resume.

- missingKeywords must contain important job requirements that are
  genuinely missing from the resume.

- suggestions must contain 3 to 5 HIGH-VALUE, PERSONALIZED suggestions.

- Every suggestion MUST be based on a specific difference between
  the resume and the job description.

- Every suggestion must clearly explain:
  1. What is missing or weak.
  2. Where it should be improved.
  3. How the candidate can improve it.

- Prioritize suggestions in this order:
  1. Important missing technical skills or technologies.
  2. Missing job responsibilities.
  3. Weak or missing project/experience evidence.
  4. Professional summary alignment.
  5. ATS formatting/content issues.

- Do NOT suggest extracurricular activities, hobbies, LinkedIn updates,
  generic soft skills, or unrelated sections unless the job description
  specifically requires them.

- Do NOT recommend adding a technology just because it appears in the
  job description. Only recommend it if it is relevant to the candidate's
  existing experience or projects, or clearly label it as a skill the
  candidate should learn rather than falsely claim.

- Never invent experience, skills, qualifications, achievements or
  technologies.

- Do not give generic suggestions such as:
  "Add more details."
  "Improve your resume."
  "Highlight your skills."
  "Add extracurricular activities."

- Prefer specific suggestions such as:
  "Your resume mentions React.js and Node.js, but the job description
  requires REST API development. If your projects involved REST APIs,
  explicitly mention the API endpoints or integrations in the project
  description."

  "Docker is listed as a job requirement but is not present in your
  resume. Add Docker to your Skills section only if you have hands-on
  experience with it."
  

  "The job description targets a Software Developer Intern role.
  Update your professional summary to explicitly mention your existing
  software development experience and relevant technologies."

- atsIssues should contain only genuine ATS/content issues found in
  the resume. Do not invent formatting problems that cannot be inferred
  from the provided resume text.

- Do NOT generate a score. The score will be calculated by the application.
`;

    const userPrompt = `
JOB DESCRIPTION:

${jobDescription}

RESUME:

${resumeText}
`;

    const response = await ai.chat.completions.create({
      model: process.env.OPENAI_MODEL,

      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],

      response_format: {
        type: "json_object",
      },
    });

    const result = JSON.parse(response.choices[0].message.content);

    // Keyword matching score
    const requiredKeywords = result.requiredKeywords || [];
    const matchedKeywords = result.matchedKeywords || [];

    let keywordScore = 0;

    if (requiredKeywords.length > 0) {
      keywordScore =
        (matchedKeywords.length / requiredKeywords.length) * 70;
    }

    // Resume section score
    let sectionScore = 0;

    const resumeLower = resumeText.toLowerCase();

    const sections = [
      "skills",
      "experience",
      "education",
      "project",
      "summary",
    ];

    const sectionsFound = sections.filter((section) =>
      resumeLower.includes(section)
    );

    sectionScore = (sectionsFound.length / sections.length) * 20;

    // Basic content score
    let contentScore = 10;

    if (resumeText.trim().length < 300) {
      contentScore = 5;
    }

    // Final ATS score
    const score = Math.round(
      keywordScore + sectionScore + contentScore
    );

    return res.status(200).json({
      ...result,
      score,
      breakdown: {
        keywordMatching: Math.round(keywordScore),
        sectionCompleteness: Math.round(sectionScore),
        contentQuality: contentScore,
      },
    });

  } catch (error) {
    console.error("ATS analysis error:", error);

    return res.status(500).json({
      message: "Failed to analyze resume",
      error: error.message,
    });
  }
};