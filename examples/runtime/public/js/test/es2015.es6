import {sum, pi} from "lib/math";
const getMessage = () => "Hello World";

export * from "lib/math";
export var e = 2.71828182846;
export default function(x) {
  return Math.exp(x);
}