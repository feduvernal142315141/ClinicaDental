import qs from "qs";
import {QueryModel} from "@/lib/models/queryModel";

export const getQueryString = (query: QueryModel) => {
  return qs.stringify(query, { arrayFormat: 'comma', encode: false });
};
