let person = [
  { firstName: "aamir", lastName: "maan", age: 46 },
  { firstName: "John", lastName: "Doe", age: 21 },
  { firstName: "Dyan", lastName: "Marlin", age: 54 },
  { firstName: "James", lastName: "stone", age: 35 }
];
const sortObjectArraybyNumber = objectArray => {
  return objectArray.sort((a, b) => {
    return a.age - b.age;
  });
};
const sortObjectArraybyNameAscend = objectArray => {
  return objectArray.sort((a, b) => {
    if (a.firstName.toLowerCase() < b.firstName.toLowerCase()) return -1;
    if (a.firstName.toLowerCase() > b.firstName.toLowerCase()) return 1;
    return 0;
  });
};
const sortObjectArraybyNameDescend = objectArray => {
  return objectArray.sort((a, b) => {
    if (a.firstName.toLowerCase() < b.firstName.toLowerCase()) return 1;
    if (a.firstName.toLowerCase() > b.firstName.toLowerCase()) return -1;
    return 0;
  });
};
console.log(sortObjectArraybyNameAscend(person));
