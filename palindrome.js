const isPalindrome1 = str => {
  str = str.replace(/\W/g, "");
  console.log(str);
  str = str.toLowerCase();
  for (i = 0; i < str.length; i++) {
    if (str[i] !== str[str.length - 1 - i]) {
      return false;
    }
  }
  return true;
};
const isPalindrome2 = str => {
  str = str.replace(/\W/g, "");
  str = str.toLowerCase();
  return (
    str ===
    str
      .split("")
      .reverse()
      .join("")
  );
};

const str = "I did, did I?";
console.log(isPalindrome2(str));
