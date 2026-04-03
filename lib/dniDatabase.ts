// Simulated DNI database for citizen lookup
export interface CitizenRecord {
  dni: string;
  fullName: string;
  birthDate: string;
  gender: "M" | "F";
}

const citizenDatabase: CitizenRecord[] = [
  { dni: "0901234567", fullName: "Roberto Sánchez Pérez", birthDate: "15/03/1998", gender: "M" },
  { dni: "0912345678", fullName: "Miguel Ángel Torres Vega", birthDate: "22/07/1995", gender: "M" },
  { dni: "0923456789", fullName: "Fernando Castillo Ramos", birthDate: "10/01/2000", gender: "M" },
  { dni: "0934567890", fullName: "Andrés Morales López", birthDate: "05/11/1999", gender: "M" },
  { dni: "0945678901", fullName: "Carlos Vega Mendoza", birthDate: "18/06/1997", gender: "M" },
  { dni: "0956789012", fullName: "David Ramos Herrera", birthDate: "30/09/1996", gender: "M" },
  { dni: "0967890123", fullName: "Jorge Mendoza Flores", birthDate: "12/04/2001", gender: "M" },
  { dni: "0978901234", fullName: "Esteban Flores García", birthDate: "25/08/1998", gender: "M" },
  { dni: "0989012345", fullName: "Ricardo Paredes Díaz", birthDate: "03/02/1994", gender: "M" },
  { dni: "0990123456", fullName: "Sebastián Guzmán Rojas", birthDate: "14/12/2002", gender: "M" },
  { dni: "1001234567", fullName: "Alejandro Ruiz Salazar", birthDate: "27/05/1997", gender: "M" },
  { dni: "1012345678", fullName: "Nicolás Delgado Vargas", birthDate: "08/10/2000", gender: "M" },
  { dni: "1023456789", fullName: "Camila Torres Mendoza", birthDate: "19/03/1999", gender: "F" },
  { dni: "1034567890", fullName: "Valentina Ramos Cruz", birthDate: "11/07/2001", gender: "F" },
  { dni: "1045678901", fullName: "María José Flores Luna", birthDate: "02/09/1998", gender: "F" },
];

/**
 * Simulates an async DNI lookup (like querying an external API)
 */
export const lookupDni = (dni: string): Promise<CitizenRecord | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const record = citizenDatabase.find((c) => c.dni === dni);
      resolve(record || null);
    }, 800);
  });
};
