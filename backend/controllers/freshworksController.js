const axios = require("axios");
const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");
const os = require("os");

const API_KEY = process.env.FRESHWORKS_API_KEY;
const BASE_URL = process.env.FRESHWORKS_BASE_URL;

const headers = {
  "Authorization": `Token token=${API_KEY}`,
  "Content-Type": "application/json",
  "Accept": "*/*"
};

let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
} catch (error) {
  console.error("Error initializing OpenAI client:", error);
}

const checkFreshworksSession = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/contacts/filters`, { 
      headers,
      validateStatus: function (status) {
        return status < 500;
      }
    });

    if (response.data && response.data.filters) {
      return { valid: true };
    }
    
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html') || 
        (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>'))) {
      return { 
        valid: false, 
        message: "Freshworks session appears to be invalid. The API returned HTML instead of JSON."
      };
    }
    
    return { 
      valid: false, 
      message: "Unexpected response format from Freshworks API. Please check your API key."
    };
  } catch (error) {
    return { 
      valid: false, 
      message: error.message || "Failed to verify Freshworks session"
    };
  }
};

exports.getLeadsFromFreshworks = async (req, res) => {
  try {
    const filters = await axios.get(`${BASE_URL}/contacts/filters`, { headers });
    const allView = filters.data.filters.find(f => f.name === "All Contacts");
    if (!allView) return res.status(404).json({ message: "No view found" });
    const viewId = allView.id;

    const contactsRes = await axios.get(
      `${BASE_URL}/contacts/view/${viewId}?per_page=100&page=1&sort=created_at&sort_type=desc&include=owner,contact_status`,
      { headers }
    );
    
    const { contacts, users, contact_status } = contactsRes.data;
    const sliced = contacts.slice(0, 100);
    
    const leads = sliced.map(c => {
      const ownerObj = users.find(u => u.id === c.owner_id);
      const statusObj = contact_status.find(s => s.id === c.contact_status_id);
      
      return {
        id: c.id,
        display_name: c.display_name,
        email: c.email,
        mobile_number: c.mobile_number,
        city: c.city,
        country: c.country,
        job_title: c.job_title,
        custom_field: c.custom_field,
        owner_name: ownerObj?.display_name || "-",
        stage_name: statusObj?.name || "-",
        created_at: c.created_at,
        last_contacted_mode : c.last_contacted_mode,
        last_contacted_time : c.last_contacted,
      };
    });

    res.status(200).json({ leads });
  } catch (error) {
    console.error("Error fetching leads from Freshworks:", error);
    res.status(500).json({ error: "Failed to fetch leads." });
  }
};

exports.getLeadConversations = async (req, res) => {
  try {
    const { leadId } = req.params;
    
    if (!leadId) {
      return res.status(400).json({ error: "Lead ID is required" });
    }

    const sessionCheck = await checkFreshworksSession();
    if (!sessionCheck.valid) {
      return res.status(401).json({
        error: "Freshworks API session is invalid",
        message: sessionCheck.message,
        needsReauthentication: true
      });
    }

    const apiUrl = `${BASE_URL}/contacts/${leadId}/conversations/all?include=email_conversation_recipients,targetable,phone_number,phone_caller,note,user`;
    
    const conversationsRes = await axios.get(
      apiUrl,
      { 
        headers: {
          ...headers,
          "Accept": "*/*",
        },
        validateStatus: function (status) {
          return status < 500;
        },
        timeout: 15000
      }
    );
    
    const contentType = conversationsRes.headers['content-type'] || '';
    if (contentType.includes('text/html') || 
        (typeof conversationsRes.data === 'string' && conversationsRes.data.includes('<!DOCTYPE html>'))) {
      return res.status(401).json({ 
        error: "Authentication or session issue with Freshworks API",
        message: "The API returned HTML content instead of JSON. Your session may have expired.",
        needsReauthentication: true
      });
    }

    if (!conversationsRes.data || !conversationsRes.data.conversations) {
      return res.status(422).json({
        error: "Invalid response from Freshworks API",
        message: "The API did not return the expected data structure. This could be due to an API change."
      });
    }

    res.status(200).json(conversationsRes.data);
  } catch (error) {
    console.error("Error fetching lead conversations:", error);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: "Request timeout",
        message: "The request to Freshworks API timed out. Please try again later."
      });
    }
    
    const errorMessage = error.response ? 
      `Status: ${error.response.status}, Message: ${error.response.statusText}` : 
      error.message;
    
    res.status(500).json({ 
      error: "Failed to fetch conversations.",
      details: errorMessage
    });
  }
};

exports.getEmailThreadDetails = async (req, res) => {
  try {
    const { emailId } = req.params;
    
    if (!emailId) {
      return res.status(400).json({ error: "Email ID is required" });
    }

    const sessionCheck = await checkFreshworksSession();
    if (!sessionCheck.valid) {
      return res.status(401).json({
        error: "Freshworks API session is invalid",
        message: sessionCheck.message,
        needsReauthentication: true
      });
    }

    // Enhanced email thread API call with more includes to get better recipient data
    const apiUrl = `${BASE_URL}/emails/${emailId}?include=email_conversation_recipients,attachments,targetable,user,contact`;
    
    const threadRes = await axios.get(
      apiUrl,
      { 
        headers,
        validateStatus: function (status) {
          return status < 500;
        },
        timeout: 15000
      }
    );
    
    const contentType = threadRes.headers['content-type'] || '';
    if (contentType.includes('text/html') || 
        (typeof threadRes.data === 'string' && threadRes.data.includes('<!DOCTYPE html>'))) {
      return res.status(401).json({ 
        error: "Authentication or session issue with Freshworks API",
        message: "The API returned HTML content instead of JSON. Your session may have expired.",
        needsReauthentication: true
      });
    }

    res.status(200).json(threadRes.data);
  } catch (error) {
    console.error("Error fetching email thread:", error);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: "Request timeout",
        message: "The request to Freshworks API timed out. Please try again later."
      });
    }
    
    const errorMessage = error.response ? 
      `Status: ${error.response.status}, Message: ${error.response.statusText}` : 
      error.message;
    
    res.status(500).json({ 
      error: "Failed to fetch email thread.",
      details: errorMessage
    });
  }
};

exports.getCompanySummary = async (req, res) => {
  try {
    const { companyName, country } = req.query;
    
    if (!companyName) {
      return res.status(400).json({ error: "Company name is required" });
    }
    
    if (!openai) {
      console.error("OpenAI client is not initialized");
      return res.status(500).json({ 
        error: "OpenAI client is not properly configured",
        details: "Check server logs for more information"
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OpenAI API key");
      return res.status(500).json({ 
        error: "OpenAI API key is missing",
        details: "Please set the OPENAI_API_KEY environment variable"
      });
    }
    
    const prompt = `Provide a brief 2-3 sentence professional summary of the company "${companyName}" from ${country || "unknown location"}. Focus on their industry, main products/services, and market position if known.`;
    
    console.log(`Sending request to OpenAI for company: ${companyName}`);
    
    const completion = await Promise.race([
      openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
        max_tokens: 100,
        temperature: 0.7,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("OpenAI API request timeout")), 15000)
      )
    ]);
    
    const summary = completion.choices[0]?.message?.content?.trim() || "No summary available.";
    
    console.log(`Received summary for ${companyName}: ${summary.substring(0, 50)}...`);
    
    res.status(200).json({ summary });
  } catch (error) {
    console.error("Error fetching company summary:", error);
    
    let errorMessage = "An unexpected error occurred";
    let errorDetails = error.message || "No details available";
    
    if (error.response) {
      errorMessage = `OpenAI API Error (${error.response.status})`;
      errorDetails = error.response.data?.error?.message || error.message;
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage = "Request to OpenAI timed out";
      errorDetails = "The OpenAI service might be experiencing high traffic or your request is too complex";
    } else if (error.message.includes('api_key')) {
      errorMessage = "OpenAI API key issue";
      errorDetails = "There might be a problem with your API key configuration";
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails
    });
  }
};

exports.getCallTranscription = async (req, res) => {
  try {
    const { recordingUrl, callDirection } = req.body;
    
    if (!recordingUrl) {
      return res.status(400).json({ error: "Recording URL is required" });
    }
    
    if (!openai) {
      console.error("OpenAI client is not initialized");
      return res.status(500).json({ 
        error: "OpenAI client is not properly configured",
        details: "Check server logs for more information"
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OpenAI API key");
      return res.status(500).json({ 
        error: "OpenAI API key is missing",
        details: "Please set the OPENAI_API_KEY environment variable"
      });
    }
    
    console.log(`Fetching call recording from URL: ${recordingUrl}`);
    
    const response = await axios({
      method: 'get',
      url: recordingUrl,
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `call_recording_${Date.now()}.wav`);
    
    fs.writeFileSync(tempFilePath, response.data);
    console.log(`Saved call recording to: ${tempFilePath}`);
    
    // Improved transcription prompt with more context about call direction
    const direction = callDirection === 'outgoing' ? 'The agent made this outgoing call' : 'This is an incoming call to the agent';
    const transcriptionPrompt = `This is a sales or customer service call. ${direction}. Give person by person transcription of the audio. Identify who is speaking as either "Agent" (the sales/support person) or "Customer" (the client) for each segment. The first speaker is likely the ${callDirection === 'outgoing' ? 'Agent' : 'Customer'}.`;
    
    console.log("Sending recording to OpenAI Whisper API for transcription...");
    const transcription = await Promise.race([
      openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-1",
        response_format: "verbose_json",
        prompt: transcriptionPrompt
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("OpenAI Whisper API request timeout")), 60000)
      )
    ]);
    
    try {
      fs.unlinkSync(tempFilePath);
      console.log(`Deleted temporary file: ${tempFilePath}`);
    } catch (cleanupError) {
      console.error(`Error deleting temporary file: ${cleanupError.message}`);
    }
    
    let processedTranscription = transcription.text;
    
    // Process segments to identify speakers
    if (transcription.segments && transcription.segments.length > 0) {
      // Process the segments to identify speakers
      const segments = identifySpeakers(transcription.segments, callDirection);
      
      return res.status(200).json({ 
        transcript: processedTranscription,
        segments: segments,
        duration: segments.length > 0 ? segments[segments.length - 1].end : 0
      });
    }
    
    return res.status(200).json({ 
      transcript: processedTranscription,
      segments: [],
      duration: 0
    });
    
  } catch (error) {
    console.error("Error transcribing call recording:", error);
    
    let errorMessage = "An unexpected error occurred";
    let errorDetails = error.message || "No details available";
    
    if (error.response) {
      errorMessage = `OpenAI API Error (${error.response?.status})`;
      errorDetails = error.response?.data?.error?.message || error.message;
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage = "Request to OpenAI timed out";
      errorDetails = "The OpenAI service might be experiencing high traffic or your request is too complex";
    } else if (error.message.includes('api_key')) {
      errorMessage = "OpenAI API key issue";
      errorDetails = "There might be a problem with your API key configuration";
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails
    });
  }
};

// Helper function to identify speakers in call transcript
function identifySpeakers(segments, callDirection) {
  // Determine who likely started the call based on call direction
  let currentSpeaker = callDirection === 'outgoing' ? 'Agent' : 'Customer';
  
  // We'll use heuristics to identify speakers based on patterns in the conversation
  return segments.map((segment, index, array) => {
    let speaker = currentSpeaker;
    
    // If this is not the first segment, try to determine if speaker changed
    if (index > 0) {
      const prevSegment = array[index - 1];
      const timeBetween = segment.start - prevSegment.end;
      
      // Check if this segment is a question
      const isQuestion = segment.text.trim().endsWith('?') || 
                         segment.text.match(/\b(what|how|where|when|why|who|could you|would you)\b/i);
      
      // Check if the previous segment was a question
      const previousWasQuestion = prevSegment.text.trim().endsWith('?') || 
                                  prevSegment.text.match(/\b(what|how|where|when|why|who|could you|would you)\b/i);
      
      // Short segments are often acknowledgments like "Okay" or "I see" and don't usually mean speaker change
      const isShort = segment.text.trim().split(' ').length <= 3;
      const prevWasShort = prevSegment.text.trim().split(' ').length <= 3;
      
      // Decision logic for speaker change
      let speakerChanged = false;
      
      // If there's a significant pause, likely a speaker change
      if (timeBetween > 1.5 && !isShort) {
        speakerChanged = true;
      }
      // If previous was a question and this isn't a short response or another question, likely a speaker change
      else if (previousWasQuestion && !isQuestion && !isShort) {
        speakerChanged = true;
      }
      // Other patterns that might indicate speaker change
      else if (
        segment.text.toLowerCase().startsWith("hello") || 
        segment.text.toLowerCase().startsWith("hi") ||
        segment.text.toLowerCase().startsWith("yes") ||
        segment.text.toLowerCase().startsWith("no")
      ) {
        speakerChanged = true;
      }
      
      if (speakerChanged) {
        currentSpeaker = currentSpeaker === 'Agent' ? 'Customer' : 'Agent';
      }
    }
    
    return {
      ...segment,
      speaker: currentSpeaker
    };
  });
}