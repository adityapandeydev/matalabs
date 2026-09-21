package handlers

import (
	"encoding/json"
	"net/http"

	"matalabs-backend/models"
)

// ActiveTestContent contains the curated 4-skill short test material
var ActiveTestContent = models.TestContent{
	ListeningAudioURL: "/api/audio/sample-listening.mp3",
	ListeningAudioText: `Receptionist: Good morning, City Central Library. How may I assist you today?
Student: Hi, I am looking to register for the quiet study research suites for the upcoming exam period.
Receptionist: Certainly! We have single cubicles and group collaboration pods on the third floor. Single cubicles can be reserved for up to three hours at a time, completely free with your student card.
Student: That sounds ideal. Do I need to book in advance through the online portal or can I simply walk in?
Receptionist: During peak exam weeks, between 10 AM and 4 PM, advance reservation is mandatory. Outside those hours, walk-in availability is first-come, first-served.
Student: Wonderful. What documentation should I bring on my first visit?
Receptionist: Just your active University ID card and proof of current semester enrollment. We will issue your digital scanner pass immediately.
Student: Thank you very much for your help!`,
	ListeningQuestions: []models.Question{
		{
			ID:     "l1",
			Prompt: "Where are the research study suites located inside the library?",
			Options: []string{
				"On the ground floor near the main entrance",
				"On the second floor beside the computer lab",
				"On the third floor",
				"In the quiet basement archive",
			},
			CorrectOption: 2,
		},
		{
			ID:     "l2",
			Prompt: "What is the maximum reservation duration for a single cubicle?",
			Options: []string{
				"One hour",
				"Two hours",
				"Three hours",
				"Full day",
			},
			CorrectOption: 2,
		},
		{
			ID:     "l3",
			Prompt: "When is advance reservation required for study spaces?",
			Options: []string{
				"Only on weekend mornings",
				"Between 10 AM and 4 PM during peak exam weeks",
				"Every evening after 6 PM",
				"Advance booking is never mandatory",
			},
			CorrectOption: 1,
		},
		{
			ID:     "l4",
			Prompt: "Which two documents must the student present on their first visit?",
			Options: []string{
				"Passport and a utility bill",
				"University ID and proof of current enrollment",
				"Driver's license and tuition receipt",
				"Library membership card and passport photograph",
			},
			CorrectOption: 1,
		},
	},
	ReadingTitle: "The Architecture of Focus in the Modern Workplace",
	ReadingPassage: `In contemporary cognitive psychology, the concept of "deep work"—the ability to focus without distraction on a cognitively demanding task—has evolved from an individual preference into an essential institutional capability. Recent neurological studies indicate that whenever knowledge workers are interrupted by notifications or task-switching, their brains incur an "attention residue." This phenomenon prevents neural circuits from achieving peak analytical performance for up to twenty minutes after even a fleeting distraction.

Consequently, progressive organizations are re-evaluating traditional open-plan offices. While originally championed to foster spontaneous collaboration, open workspaces frequently induce hyper-vigilance, prompting employees to adopt defensive strategies such as wearing noise-canceling headphones throughout the day. Emerging workplace architectural paradigms emphasize a "hub-and-spoke" topography: central communal zones designed deliberately for lively discourse, surrounded by acoustic isolation chambers strictly reserved for solitary deep synthesis.

Crucially, deep work is not merely a spatial consideration; it demands rigorous temporal discipline. Cognitive research demonstrates that uninterrupted ninety-minute cycles align harmoniously with the human brain's ultradian biological rhythms, maximizing problem-solving velocity while preempting mental exhaustion.`,
	ReadingQuestions: []models.Question{
		{
			ID:     "r1",
			Prompt: "What does the term 'attention residue' refer to in the passage?",
			Options: []string{
				"A permanent loss of memory caused by digital screen exposure",
				"The cognitive lag where peak focus is impaired for up to 20 minutes following an interruption",
				"The physical strain experienced after prolonged reading sessions",
				"The psychological comfort of multitasking during complex projects",
			},
			CorrectOption: 1,
		},
		{
			ID:     "r2",
			Prompt: "Why are organizations rethinking open-plan offices according to the text?",
			Options: []string{
				"They are too expensive to construct and maintain",
				"They often create hyper-vigilance and continuous distraction despite intentions of collaboration",
				"Modern safety regulations require enclosed rooms",
				"Employees prefer working entirely without colleagues",
			},
			CorrectOption: 1,
		},
		{
			ID:     "r3",
			Prompt: "What characterizes the 'hub-and-spoke' workplace layout?",
			Options: []string{
				"Equal sized desks placed in concentric circles",
				"Central collaborative meeting zones surrounded by acoustic isolation chambers",
				"A single quiet library floor with no talking allowed anywhere",
				"Individual offices without any communal areas",
			},
			CorrectOption: 1,
		},
		{
			ID:     "r4",
			Prompt: "Why are 90-minute work cycles recommended by cognitive research?",
			Options: []string{
				"They match standard university lecture lengths",
				"They align with human ultradian rhythms to optimize productivity and prevent exhaustion",
				"They allow employees to take four breaks per day",
				"They fit neatly into typical eight-hour corporate shifts",
			},
			CorrectOption: 1,
		},
	},
	WritingPrompt:   "Some people argue that technological automation will diminish human creativity and critical thinking, while others contend it enhances human cognitive potential. Discuss both views and give your own opinion with relevant examples.",
	WritingMinWords: 150,
	SpeakingQuestions: []string{
		"Could you tell me about an interesting place in your hometown and why you would recommend it to a visitor?",
		"How do you prefer to spend your free time when you want to relax after a challenging week?",
	},
}

// GetTestContentHandler returns the public test material with correct answers omitted
func GetTestContentHandler(w http.ResponseWriter, r *http.Request) {
	// Clone content and strip CorrectOption so answer key is never leaked
	safeContent := ActiveTestContent

	safeListening := make([]models.Question, len(ActiveTestContent.ListeningQuestions))
	for i, q := range ActiveTestContent.ListeningQuestions {
		safeListening[i] = models.Question{
			ID:            q.ID,
			Prompt:        q.Prompt,
			Options:       q.Options,
			CorrectOption: -1, // hidden
		}
	}
	safeContent.ListeningQuestions = safeListening

	safeReading := make([]models.Question, len(ActiveTestContent.ReadingQuestions))
	for i, q := range ActiveTestContent.ReadingQuestions {
		safeReading[i] = models.Question{
			ID:            q.ID,
			Prompt:        q.Prompt,
			Options:       q.Options,
			CorrectOption: -1, // hidden
		}
	}
	safeContent.ReadingQuestions = safeReading

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(safeContent)
}

// CalculateObjectiveScore converts correct answers out of 4 to an IELTS 0-9 half-band scale
func CalculateObjectiveScore(userAnswers map[string]int, questions []models.Question) float64 {
	if len(questions) == 0 {
		return 0.0
	}

	correctCount := 0
	for _, q := range questions {
		if selected, exists := userAnswers[q.ID]; exists && selected == q.CorrectOption {
			correctCount++
		}
	}

	// 4 questions scale (half steps only):
	// 4/4 -> 8.5
	// 3/4 -> 7.0
	// 2/4 -> 5.5
	// 1/4 -> 4.0
	// 0/4 -> 2.5
	switch correctCount {
	case 4:
		return 8.5
	case 3:
		return 7.0
	case 2:
		return 5.5
	case 1:
		return 4.0
	default:
		return 2.5
	}
}
