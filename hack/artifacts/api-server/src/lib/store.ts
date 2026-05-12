import { randomUUID } from "node:crypto";

export type Accessibility = {
  deaf: boolean;
  wheelchair: boolean;
  visuallyImpaired: boolean;
  nonVerbal: boolean;
  cognitive: boolean;
};

export type Guest = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  room: string;
  floor: number;
  language: string;
  accessibility: Accessibility;
  checkedInAt: string;
  rewardPoints: number;
  hasTakenSurvey: boolean;
  surveyScore: number | null;
};

export type SurveyQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
};

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  status: "available" | "dispatched" | "busy";
  floor: number;
  x: number;
  y: number;
  assignedIncidentId: string | null;
};

export type IncidentLogEntry = { timestamp: string; message: string };
export type CoachMessage = {
  role: "guest" | "ai";
  text: string;
  timestamp: string;
};

export type Incident = {
  id: string;
  type: "Fire" | "Medical" | "Security" | "Other";
  room: string;
  floor: number;
  x: number;
  y: number;
  status: "active" | "accepted" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
  guestId: string | null;
  guestName: string | null;
  accessibility: Accessibility | null;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  assignedRole: string | null;
  description: string | null;
  aiSummary: string | null;
  log: IncidentLogEntry[];
  coachMessages: CoachMessage[];
};

export type ActivityItem = {
  id: string;
  timestamp: string;
  kind: string;
  message: string;
};

const blankAccess = (): Accessibility => ({
  deaf: false,
  wheelchair: false,
  visuallyImpaired: false,
  nonVerbal: false,
  cognitive: false,
});

function roomCoords(room: string, floor: number): { x: number; y: number } {
  const n = parseInt(room.replace(/\D/g, ""), 10) || 0;
  const x = ((n % 10) / 10) * 100;
  const y = ((floor - 1) * 25) % 100;
  return { x: Math.max(5, Math.min(95, x + 5)), y: Math.max(5, Math.min(95, y + 5)) };
}

class Store {
  guests: Guest[] = [];
  staff: StaffMember[] = [];
  incidents: Incident[] = [];
  activity: ActivityItem[] = [];
  completedSurveys: Set<string> = new Set(); // Stores email or phone

  surveyQuestions: SurveyQuestion[] = [
    {
      id: "q1",
      question: "In case of a fire, what should you use to evacuate the hotel?",
      options: ["Elevator", "Stairs", "Window", "Stay in your room"],
      correctAnswerIndex: 1,
      explanation: "Elevators can malfunction or open on fire floors during an emergency. Stairs are the designated and safest exit route."
    },
    {
      id: "q2",
      question: "If you encounter a medical emergency in your room, what is the fastest way to get help?",
      options: ["Search for a hospital online", "Call the front desk emergency button", "Run to the lobby", "Wait for someone to walk by"],
      correctAnswerIndex: 1,
      explanation: "Hotel staff are trained first responders and can coordinate with paramedics immediately, saving critical time."
    },
    {
      id: "q3",
      question: "If you see a suspicious person or package in the hotel, you should...",
      options: ["Investigate it yourself", "Ignore it", "Report to security or front desk", "Post about it on social media"],
      correctAnswerIndex: 2,
      explanation: "Always report suspicious activity to trained security professionals. Do not attempt to handle potentially dangerous situations yourself."
    },
    {
      id: "q4",
      question: "During an earthquake, what is the recommended action?",
      options: ["Run outside immediately", "Go to the roof", "Drop, Cover, and Hold on", "Hide in a closet"],
      correctAnswerIndex: 2,
      explanation: "Running during shaking is dangerous. Protecting your head and neck under sturdy furniture is the proven safety method."
    },
    {
      id: "q5",
      question: "During a power outage, what is the safest light source to use?",
      options: ["Candles", "Lighter", "Flashlight or Phone light", "Matches"],
      correctAnswerIndex: 2,
      explanation: "Open flames are major fire hazards in hotels. Always use battery-powered or electronic light sources."
    }
  ];

  constructor() {
    this.seed();
  }

  private seed() {
    this.guests = [
      {
        id: "g_demo_1",
        name: "Amelia Chen",
        email: "amelia@example.com",
        phone: "+1234567890",
        room: "412",
        floor: 4,
        language: "en",
        accessibility: { ...blankAccess(), wheelchair: true },
        checkedInAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        rewardPoints: 50,
        hasTakenSurvey: true,
        surveyScore: 100,
      },
      {
        id: "g_demo_2",
        name: "Marcus Lange",
        email: null,
        phone: null,
        room: "308",
        floor: 3,
        language: "de",
        accessibility: { ...blankAccess(), visuallyImpaired: true },
        checkedInAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
        rewardPoints: 0,
        hasTakenSurvey: false,
        surveyScore: null,
      },
      {
        id: "g_demo_3",
        name: "Yuki Tanaka",
        email: null,
        phone: null,
        room: "215",
        floor: 2,
        language: "ja",
        accessibility: { ...blankAccess(), deaf: true },
        checkedInAt: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
        rewardPoints: 0,
        hasTakenSurvey: false,
        surveyScore: null,
      },
      {
        id: "g_demo_4",
        name: "Sofia Rivera",
        email: null,
        phone: null,
        room: "521",
        floor: 5,
        language: "es",
        accessibility: { ...blankAccess(), nonVerbal: true },
        checkedInAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        rewardPoints: 0,
        hasTakenSurvey: false,
        surveyScore: null,
      },
    ];

    this.staff = [
      { id: "s1", name: "Jordan Pierce", role: "First Responder", status: "available", floor: 4, x: 30, y: 60, assignedIncidentId: null },
      { id: "s2", name: "Priya Natarajan", role: "Escort", status: "available", floor: 3, x: 70, y: 40, assignedIncidentId: null },
      { id: "s3", name: "Ahmed Khoury", role: "Coordinator", status: "available", floor: 1, x: 50, y: 20, assignedIncidentId: null },
      { id: "s4", name: "Linh Tran", role: "First Responder", status: "available", floor: 2, x: 20, y: 80, assignedIncidentId: null },
      { id: "s5", name: "Devon Walsh", role: "Security", status: "available", floor: 5, x: 60, y: 50, assignedIncidentId: null },
    ];

    this.activity = [
      {
        id: randomUUID(),
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        kind: "checkin",
        message: "Sofia Rivera checked in (Room 521, non-verbal)",
      },
      {
        id: randomUUID(),
        timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        kind: "system",
        message: "Camera anomaly scan completed — all clear",
      },
    ];
  }

  addActivity(kind: string, message: string) {
    this.activity.unshift({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      kind,
      message,
    });
    this.activity = this.activity.slice(0, 50);
  }

  createGuest(input: {
    name: string;
    email?: string | null;
    phone?: string | null;
    room: string;
    language: string;
    accessibility: Accessibility;
  }): Guest {
    const isOccupied = this.guests.some(g => g.room.toLowerCase() === input.room.toLowerCase());
    if (isOccupied) {
      throw new Error(`Room ${input.room} is already occupied.`);
    }

    const hasTaken = (input.email && this.completedSurveys.has(input.email)) || 
                     (input.phone && this.completedSurveys.has(input.phone));

    const floor = parseInt(input.room.replace(/\D/g, "").slice(0, 1), 10) || 1;
    const guest: Guest = {
      id: `g_${randomUUID()}`,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      room: input.room,
      floor,
      language: input.language,
      accessibility: input.accessibility,
      checkedInAt: new Date().toISOString(),
      rewardPoints: 0,
      hasTakenSurvey: !!hasTaken,
      surveyScore: null,
    };
    this.guests.unshift(guest);
    this.addActivity("checkin", `${guest.name} checked in (Room ${guest.room})`);
    return guest;
  }

  checkoutGuest(id: string): boolean {
    const index = this.guests.findIndex(g => g.id === id);
    if (index === -1) return false;
    
    const guest = this.guests[index];
    this.guests.splice(index, 1);
    this.addActivity("checkout", `${guest.name} checked out (Room ${guest.room})`);
    return true;
  }

  createIncident(input: {
    type: Incident["type"];
    room: string;
    floor: number;
    guestId?: string | null;
    description?: string | null;
  }): Incident {
    const guest = input.guestId
      ? this.guests.find((g) => g.id === input.guestId) ?? null
      : null;
    const coords = roomCoords(input.room, input.floor);
    const incident: Incident = {
      id: `i_${randomUUID()}`,
      type: input.type,
      room: input.room,
      floor: input.floor,
      x: coords.x,
      y: coords.y,
      status: "active",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      guestId: guest?.id ?? null,
      guestName: guest?.name ?? null,
      accessibility: guest?.accessibility ?? null,
      assignedStaffId: null,
      assignedStaffName: null,
      assignedRole: null,
      description: input.description ?? null,
      aiSummary: null,
      log: [
        {
          timestamp: new Date().toISOString(),
          message: `SOS triggered — ${input.type} reported at room ${input.room}`,
        },
      ],
      coachMessages: [],
    };

    // Auto-dispatch nearest available staff
    const nearest = this.staff
      .filter((s) => s.status === "available")
      .map((s) => ({
        s,
        d: Math.hypot(s.floor - input.floor, (s.x - coords.x) / 10),
      }))
      .sort((a, b) => a.d - b.d)[0];

    if (nearest) {
      const role = guest?.accessibility?.wheelchair
        ? "Escort (Wheelchair)"
        : input.type === "Security"
          ? "Security"
          : nearest.s.role;
      nearest.s.status = "dispatched";
      nearest.s.assignedIncidentId = incident.id;
      incident.assignedStaffId = nearest.s.id;
      incident.assignedStaffName = nearest.s.name;
      incident.assignedRole = role;
      incident.log.push({
        timestamp: new Date().toISOString(),
        message: `${nearest.s.name} dispatched as ${role}`,
      });
    }

    this.incidents.unshift(incident);
    this.addActivity(
      "incident",
      `${input.type} alert — Room ${input.room}${guest ? ` (${guest.name})` : ""}`,
    );
    return incident;
  }

  updateIncidentStatus(
    id: string,
    status: Incident["status"],
  ): Incident | null {
    const inc = this.incidents.find((i) => i.id === id);
    if (!inc) return null;
    inc.status = status;
    inc.log.push({
      timestamp: new Date().toISOString(),
      message: `Status changed to ${status}`,
    });
    if (status === "resolved") {
      inc.resolvedAt = new Date().toISOString();
      const staff = this.staff.find((s) => s.id === inc.assignedStaffId);
      if (staff) {
        staff.status = "available";
        staff.assignedIncidentId = null;
      }
      this.addActivity("resolved", `Incident at Room ${inc.room} resolved`);
    } else if (status === "accepted") {
      this.addActivity("accepted", `Incident at Room ${inc.room} accepted by ${inc.assignedStaffName ?? "staff"}`);
    }
    return inc;
  }

  appendCoach(id: string, role: "guest" | "ai", text: string) {
    const inc = this.incidents.find((i) => i.id === id);
    if (!inc) return null;
    inc.coachMessages.push({
      role,
      text,
      timestamp: new Date().toISOString(),
    });
    return inc;
  }

  setAiSummary(id: string, summary: string) {
    const inc = this.incidents.find((i) => i.id === id);
    if (inc) inc.aiSummary = summary;
  }

  submitSurvey(guestId: string, answers: number[]) {
    const guest = this.guests.find(g => g.id === guestId);
    if (!guest) throw new Error("Guest not found");
    if (guest.hasTakenSurvey) throw new Error("Survey already completed");

    let correctCount = 0;
    answers.forEach((ans, idx) => {
      if (this.surveyQuestions[idx] && ans === this.surveyQuestions[idx].correctAnswerIndex) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / this.surveyQuestions.length) * 100);
    const rewardPointsEarned = correctCount * 10; // 10 points per correct answer
    
    guest.rewardPoints += rewardPointsEarned;
    guest.hasTakenSurvey = true;
    guest.surveyScore = score;

    if (guest.email) this.completedSurveys.add(guest.email);
    if (guest.phone) this.completedSurveys.add(guest.phone);

    this.addActivity("survey", `${guest.name} completed safety survey (Score: ${score}%)`);

    return {
      score,
      rewardPointsEarned,
      totalRewardPoints: guest.rewardPoints,
      passed: score >= 75
    };
  }
}

export const store = new Store();
