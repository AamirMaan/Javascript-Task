const reverseString = string => {
  // let reverseStr = "";
  //   for (let i = 0; i < string.length; i++) {
  //     reverseStr += string[string.length - 1 - i];
  //   }
  //   return reverseStr;
  // -----------------------
  //   return (string = string
  //     .split("")
  //     .reverse()
  //     .join(""));
  // ------------------------
  //   for (let char in string) {
  //     reverseStr = string[char] + reverseStr;
  //   }
  //   return reverseStr;
  // ------------------------
  let reverseStr = "";
  string.split("").forEach(char => {
    reverseStr = char + reverseStr;
  });
  return reverseStr;
};
const reverseInt = int => {
  const reverseStr = int
    .toString()
    .split("")
    .reverse()
    .join("");
  return parseInt(reverseStr);
};

console.log(reverseInt(1234));
