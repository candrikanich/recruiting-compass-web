/**
 * Available template variables for communication templates
 * Each variable can be interpolated into templates using {{variableName}} syntax
 */

export interface TemplateVariable {
  name: string;
  key: string;
  description: string;
  example: string;
}

export const AVAILABLE_VARIABLES: TemplateVariable[] = [
  {
    name: "Player Name",
    key: "playerName",
    description: "Full name of the player",
    example: "John Smith",
  },
  {
    name: "Coach First Name",
    key: "coachFirstName",
    description: "Coach's first name",
    example: "Mike",
  },
  {
    name: "Coach Last Name",
    key: "coachLastName",
    description: "Coach's last name",
    example: "Johnson",
  },
  {
    name: "School Name",
    key: "schoolName",
    description: "University name",
    example: "Ohio State University",
  },
  {
    name: "High School",
    key: "highSchool",
    description: "Player's high school",
    example: "Lincoln High School",
  },
  {
    name: "Grad Year",
    key: "gradYear",
    description: "Expected graduation year",
    example: "2025",
  },
  {
    name: "Position",
    key: "position",
    description: "Player's position",
    example: "Shortstop",
  },
  {
    name: "Division",
    key: "division",
    description: "NCAA Division",
    example: "D1",
  },
  {
    name: "Event Name",
    key: "eventName",
    description: "Name of camp/showcase/game",
    example: "Area Code Games",
  },
  {
    name: "School Twitter",
    key: "schoolTwitter",
    description: "School's Twitter handle (without @)",
    example: "OhioStateBB",
  },
  {
    name: "Today Date",
    key: "todayDate",
    description: "Current date formatted",
    example: "December 7, 2025",
  },
];

/**
 * Get variable by key
 */
export const getVariable = (key: string): TemplateVariable | undefined => {
  return AVAILABLE_VARIABLES.find((v) => v.key === key);
};

/**
 * Get all available variable names for documentation
 */
export const getVariableNames = (): string[] => {
  return AVAILABLE_VARIABLES.map((v) => `{{${v.key}}}`);
};
