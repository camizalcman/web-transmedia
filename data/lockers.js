// Cuentas escritas a mano en la hoja que esta dentro de un locker. El
// resultado de cada una (de 0 a 9) es un numero del codigo del candado, en
// orden: la primera cuenta es la rueda de arriba. El codigo sale de aca, asi
// que para cambiarlo alcanza con cambiar las cuentas.
// Se puede usar + - × ÷, parentesis y potencias (² ³), con la precedencia de
// siempre: primero potencias, despues × y ÷, al final + y -.
export const LOCK_CLUES = ["9 - 4 × 2", "(5 + 7) ÷ 4", "3 × 4 - 6"];

const POWERS = { "²": 2, "³": 3 };

export const LOCK_CODE = LOCK_CLUES.map(solve).join("");

function solve(clue) {
  const tokens = clue.match(/\d+|[+\-×÷()²³]/g) ?? [];
  let position = 0;
  const fail = () => {
    throw new Error(`No se entiende la cuenta "${clue}".`);
  };

  // suma := producto (("+" | "-") producto)*
  function sum() {
    let value = product();
    while (tokens[position] === "+" || tokens[position] === "-") {
      const operator = tokens[position++];
      value = operator === "+" ? value + product() : value - product();
    }
    return value;
  }

  // producto := potencia (("×" | "÷") potencia)*
  function product() {
    let value = power();
    while (tokens[position] === "×" || tokens[position] === "÷") {
      const operator = tokens[position++];
      value = operator === "×" ? value * power() : value / power();
    }
    return value;
  }

  // potencia := numero o (suma), seguido opcionalmente de ² o ³
  function power() {
    let value;
    if (tokens[position] === "(") {
      position++;
      value = sum();
      if (tokens[position++] !== ")") fail();
    } else if (/^\d+$/.test(tokens[position] ?? "")) {
      value = Number(tokens[position++]);
    } else {
      fail();
    }
    while (POWERS[tokens[position]]) value **= POWERS[tokens[position++]];
    return value;
  }

  const result = sum();
  if (position !== tokens.length) fail();
  if (!Number.isInteger(result) || result < 0 || result > 9) {
    throw new Error(`La cuenta "${clue}" tiene que dar un numero de 0 a 9.`);
  }
  return result;
}
