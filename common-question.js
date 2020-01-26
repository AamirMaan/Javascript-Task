const charFrequency = string => {
  let charMap = {};

  for (i = 0; i < string.length; i++) {
    let char = string[i];
    if (char in charMap) {
      charMap[char]++;
    } else {
      charMap[char] = 1;
    }
  }
  var sortable = [];
  for (var char in charMap) {
    sortable.push([char, charMap[char]]);
  }
  return sortable.sort(function(a, b) {
    return b[1] - a[1];
  });
  // let maxNum = 0;
  // let maxChar = "";
  // for (let char in charMap) {
  //   if (charMap[char] > maxNum) {
  //     maxNum = charMap[char];
  //     maxChar = char;
  //   }
  // }
  // return maxChar + "=" + maxNum;
};
console.log(charFrequency("This is a common interview question"));
