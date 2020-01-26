//time complexity: O(nlog)
const isAnagram1 = (string, target) => {
  string = string
    .toUpperCase()
    .split("")
    .sort()
    .join(""); //toUpperCase() or toLowerCase()
  target = target
    .toUpperCase()
    .split("")
    .sort()
    .join("");
  return string === target;
};
//time complexity: O(n) - linear
const isAnagram2 = (string, target) => {
  string = string.toLowerCase();
  target = target.toLowerCase();
  let hist = {};
  for (i = 0; i < string.length; i++) {
    let char = string[i];
    if (char in hist) {
      hist[char]++;
    } else {
      hist[char] = 1;
    }
  }
  for (i = 0; i < target.length; i++) {
    let char = target[i];
    if (char in hist) {
      hist[char]--;
    } else {
      return false;
    }
  }
  for (let key in hist) {
    if (hist[key]) {
      return false;
    }
  }
  return true;
};

console.log(isAnagram2("Abc", "cab"));
