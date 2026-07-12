import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const curriculum = [
  {
    slug: "ppl",
    shortName: "PPL",
    name: "Private Pilot Licence",
    description:
      "The foundation licence for all professional flying. Eight theoretical knowledge examinations covering the fundamentals of airmanship, aircraft operation and the regulatory framework.",
    sortOrder: 1,
    subjects: [
      ["air-law", "Air Law & Procedures", "Rules of the air, airspace, licensing and SACAA regulatory requirements."],
      ["meteorology", "Aviation Meteorology", "The atmosphere, weather systems, hazards and interpretation of aviation weather reports."],
      ["navigation", "Navigation", "Chart work, dead reckoning, headings, groundspeed and time calculations."],
      ["aircraft-technical", "Aircraft Technical & General", "Airframes, engines, systems and instruments for light aircraft."],
      ["flight-performance", "Flight Performance & Planning", "Mass and balance, take-off and landing performance, fuel planning."],
      ["human-performance", "Human Performance & Limitations", "Aviation physiology, psychology, threat and error management."],
      ["principles-of-flight", "Principles of Flight", "Aerodynamics, lift, drag, stability and control."],
      ["radiotelephony", "Radiotelephony & Communications", "Standard phraseology, radio procedures and communication failure."],
    ],
  },
  {
    slug: "cpl",
    shortName: "CPL",
    name: "Commercial Pilot Licence",
    description:
      "The professional licence that permits remunerated flying. Eight examinations at a substantially deeper technical level than the PPL syllabus.",
    sortOrder: 2,
    subjects: [
      ["air-law", "Air Law & Procedures", "ICAO annexes, CARs/CATS, operational procedures and commercial regulations."],
      ["meteorology", "Aviation Meteorology", "Synoptic meteorology, upper-air charts, hazardous phenomena and forecasting."],
      ["general-navigation", "General Navigation", "Advanced dead reckoning, gridded charts, relative velocity and the flight computer."],
      ["flight-planning", "Flight Performance & Planning", "Performance classes, mass and balance, route fuel planning and point of safe return."],
      ["aircraft-technical", "Aircraft Technical & General", "Piston and turbine powerplants, airframe systems, electrics and hydraulics."],
      ["instruments", "Instruments & Electronics", "Pressure and gyroscopic instruments, magnetism, AHRS and electronic displays."],
      ["human-performance", "Human Performance & Limitations", "Advanced physiology, sensory illusions, CRM and fatigue management."],
      ["radio-aids", "Radio Aids & Communications", "VOR, ADF, DME, ILS, radar theory and GNSS principles."],
    ],
  },
  {
    slug: "instrument-rating",
    shortName: "IR",
    name: "Instrument Rating",
    description:
      "The rating that permits flight under the Instrument Flight Rules. Examinations focused on instrument procedures, radio navigation and IFR planning.",
    sortOrder: 3,
    subjects: [
      ["air-law", "Air Law & Procedures (IFR)", "IFR airspace, ATC clearances, holding, departure and approach procedures."],
      ["instruments", "Instruments & Electronics", "Flight instruments, autoflight, flight directors and failure analysis under IFR."],
      ["meteorology", "Aviation Meteorology (IFR)", "Icing, thunderstorms, low visibility operations and en-route weather interpretation."],
      ["radio-navigation", "Radio Aids & Navigation", "ILS, VOR, NDB, RNAV/GNSS approaches, PBN and instrument approach charts."],
      ["flight-planning", "Flight Planning & Performance", "IFR fuel requirements, alternates, minima and airways flight planning."],
    ],
  },
  {
    slug: "atpl",
    shortName: "ATPL",
    name: "Airline Transport Pilot Licence",
    description:
      "The highest level of aircrew licensing, required to command multi-crew transport aircraft. Nine subject areas examined at airline operational depth.",
    sortOrder: 4,
    subjects: [
      ["air-law", "Air Law & Procedures", "ICAO framework, multi-crew operations, AOC requirements and international procedures."],
      ["meteorology", "Aviation Meteorology", "Global climatology, jet streams, significant weather charts and long-range forecasting."],
      ["general-navigation", "General Navigation", "Great circle theory, grid navigation, inertial systems and polar navigation."],
      ["flight-planning", "Flight Planning", "Computer flight plans, ETOPS, reclearance, fuel policy and route optimisation."],
      ["instruments", "Instruments & Electronics", "EFIS, FMS, autoflight, air data systems and warning systems on transport aircraft."],
      ["aircraft-technical", "Aircraft Technical & General", "Turbofan engines, pressurisation, high-speed flight and transport aircraft systems."],
      ["performance", "Performance & Loading", "Performance class A, balanced field, climb gradients, cruise control and mass & balance."],
      ["human-performance", "Human Performance & Limitations", "Multi-crew cooperation, fatigue risk management and advanced aeromedical factors."],
      ["radio-aids", "Radio Aids & Communications", "Advanced radio navigation theory, radar, TCAS, transponders and datalink."],
    ],
  },
];

async function main() {
  for (const q of curriculum) {
    const [row] = await sql`
      INSERT INTO qualifications (slug, name, short_name, description, sort_order)
      VALUES (${q.slug}, ${q.name}, ${q.shortName}, ${q.description}, ${q.sortOrder})
      ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name,
            short_name = EXCLUDED.short_name,
            description = EXCLUDED.description,
            sort_order = EXCLUDED.sort_order
      RETURNING id`;
    let i = 0;
    for (const [slug, name, description] of q.subjects) {
      i += 1;
      await sql`
        INSERT INTO subjects (qualification_id, slug, name, description, sort_order)
        VALUES (${row.id}, ${slug}, ${name}, ${description}, ${i})
        ON CONFLICT (qualification_id, slug) DO UPDATE
          SET name = EXCLUDED.name,
              description = EXCLUDED.description,
              sort_order = EXCLUDED.sort_order`;
    }
    console.log(`Seeded ${q.shortName} with ${q.subjects.length} subjects`);
  }
}

main().then(() => {
  console.log("Seed complete.");
  process.exit(0);
});
