// Cuentas escritas a mano en la hoja que esta dentro de un locker. El
// resultado de cada una (de 0 a 9) es un numero del codigo del candado, en
// orden: la primera cuenta es la rueda de arriba. El codigo sale de aca, asi
// que para cambiarlo alcanza con cambiar las cuentas.
export const LOCK_CLUES = ["4 - 3", "1 + 2", "2 + 4"];

export const LOCK_CODE = LOCK_CLUES.map(solve).join("");

function solve(clue) {
  const [a, operator, b] = clue.split(" ");
  const result = operator === "+" ? Number(a) + Number(b) : Number(a) - Number(b);
  if (!Number.isInteger(result) || result < 0 || result > 9) {
    throw new Error(`La cuenta "${clue}" tiene que dar un numero de 0 a 9.`);
  }
  return result;
}
