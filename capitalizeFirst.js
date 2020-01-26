const capitalizeFirst = str => {
  // const arrayStr = str.toLowerCase().split(" ");
  // for (let i = 0; i < arrayStr.length; i++) {
  //   arrayStr[i] =
  //     arrayStr[i].substring(0, 1).toUpperCase() + arrayStr[i].substring(1);
  // }
  // return arrayStr.join(" ");
  // ----------------
  // return str
  //   .toLowerCase()
  //   .split(" ")
  //   .map(word => word[0].toUpperCase() + word.substr(1))
  //   .join(" ");
  // ----------------
  return str.replace(/\b[a-z]/gi, char => {
    return char.toUpperCase();
  });
};
console.log(capitalizeFirst("i love coding"));
