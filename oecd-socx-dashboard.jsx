import { useState, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, AreaChart, Area
} from "recharts";
import * as XLSX from "xlsx";

// ── SOCX 9 branches (order matches data arrays) ──
const CATEGORIES = [
  { key: "oldAge",       en: "Old age",        ja: "高齢" },
  { key: "survivors",    en: "Survivors",      ja: "遺族" },
  { key: "incapacity",   en: "Incapacity",     ja: "障害・業務災害・傷病" },
  { key: "health",       en: "Health",         ja: "保健" },
  { key: "family",       en: "Family",         ja: "家族" },
  { key: "almp",         en: "ALMP",           ja: "積極的労働市場政策" },
  { key: "unemployment", en: "Unemployment",   ja: "失業" },
  { key: "housing",      en: "Housing",        ja: "住宅" },
  { key: "other",        en: "Other",          ja: "その他" },
];

const COUNTRIES = {
  JPN: { en: "Japan",       ja: "日本",         flag: "🇯🇵", color: "#dc2626" },
  DNK: { en: "Denmark",     ja: "デンマーク",    flag: "🇩🇰", color: "#2563eb" },
  SWE: { en: "Sweden",      ja: "スウェーデン",  flag: "🇸🇪", color: "#eab308" },
  FIN: { en: "Finland",     ja: "フィンランド",  flag: "🇫🇮", color: "#0ea5e9" },
  NOR: { en: "Norway",      ja: "ノルウェー",    flag: "🇳🇴", color: "#ef4444" },
  FRA: { en: "France",      ja: "フランス",      flag: "🇫🇷", color: "#8b5cf6" },
  DEU: { en: "Germany",     ja: "ドイツ",        flag: "🇩🇪", color: "#f97316" },
  GBR: { en: "UK",          ja: "イギリス",      flag: "🇬🇧", color: "#14b8a6" },
  USA: { en: "USA",         ja: "アメリカ",      flag: "🇺🇸", color: "#6366f1" },
  KOR: { en: "Korea",       ja: "韓国",          flag: "🇰🇷", color: "#ec4899" },
  ITA: { en: "Italy",       ja: "イタリア",      flag: "🇮🇹", color: "#22c55e" },
  CAN: { en: "Canada",      ja: "カナダ",        flag: "🇨🇦", color: "#b91c1c" },
  NLD: { en: "Netherlands", ja: "オランダ",      flag: "🇳🇱", color: "#f59e0b" },
  OECD: { en: "OECD avg",   ja: "OECD平均",      flag: "🏛️", color: "#78716c" },
};

// ── Real OECD SOCX data (% of GDP) ──
// Each year has: t (total), c (cash), k (in-kind) arrays of length 9
// matching CATEGORIES order. null = data not available/not applicable.
// Source: OECD.Stat DSD_SOCX_AGG, extracted April 2026.
const RAW_DATA = {
  JPN: {
    2005: {t:[7.889,1.212,0.66,5.82,0.704,0.128,0.22,0.08,0.172],c:[6.764,1.194,0.543,null,0.265,null,0.22,null,0.166],k:[1.126,0.018,0.117,5.82,0.439,null,null,0.08,0.006]},
    2010: {t:[9.675,1.35,0.888,7.049,1.127,0.282,0.256,0.102,0.252],c:[8.164,1.338,0.618,null,0.693,null,0.256,null,0.236],k:[1.511,0.012,0.27,7.049,0.433,null,null,0.102,0.016]},
    2015: {t:[8.274,1.237,1.024,9.188,1.409,0.153,0.172,0.115,0.342],c:[8.04,1.225,0.611,null,0.656,null,0.172,null,0.264],k:[0.234,0.012,0.413,9.188,0.753,null,null,0.115,0.078]},
    2019: {t:[8.41,1.167,1.124,9.587,1.748,0.15,0.162,0.109,0.309],c:[8.196,1.155,0.638,null,0.664,null,0.162,null,0.223],k:[0.214,0.012,0.486,9.587,1.084,null,null,0.109,0.086]},
    2021: {t:[8.459,1.142,1.199,10.917,2.235,0.581,0.235,0.115,0.564],c:[8.249,1.129,0.659,null,0.995,null,0.235,null,0.473],k:[0.21,0.013,0.541,10.917,1.24,null,null,0.115,0.091]},
  },
  DNK: {
    2005: {t:[8.213,0.008,4.418,5.819,3.491,1.522,0,0.687,0.972],c:[6.439,0,3.179,null,1.507,null,0,null,0.742],k:[1.774,0.008,1.239,5.819,1.984,null,null,0.687,0.23]},
    2010: {t:[8.978,0.026,5.891,7.217,3.889,2.019,0,0.672,1.184],c:[7.108,0.018,3.59,null,1.561,null,0,null,0.853],k:[1.87,0.008,2.301,7.217,2.327,null,null,0.672,0.331]},
    2015: {t:[9.727,0.015,5.222,7.24,3.53,2.049,0,0.702,1.581],c:[8.07,0.009,3.03,null,1.357,null,0,null,1.165],k:[1.656,0.006,2.192,7.24,2.173,null,null,0.702,0.416]},
    2019: {t:[9.984,0.011,4.646,6.936,3.323,1.89,0,0.657,1.295],c:[8.149,0.005,2.725,null,1.273,null,0,null,0.94],k:[1.835,0.006,1.921,6.936,2.05,null,null,0.657,0.354]},
    2021: {t:[9.274,0.008,4.735,7.555,3.146,1.642,0.006,0.604,1.122],c:[7.51,0.003,2.872,null,1.187,null,0.006,null,0.806],k:[1.764,0.005,1.863,7.555,1.959,null,null,0.604,0.316]},
  },
  SWE: {
    2005: {t:[9.331,0.584,5.23,6.096,3.133,1.094,1.124,0.505,0.576],c:[7.119,0.584,3.474,null,1.42,null,1.124,null,0.317],k:[2.213,null,1.756,6.096,1.713,null,null,0.505,0.259]},
    2010: {t:[9.8,0.456,4.106,6.293,3.395,1.102,0.561,0.43,0.667],c:[7.585,0.456,2.226,null,1.429,null,0.561,null,0.345],k:[2.215,null,1.88,6.293,1.966,null,null,0.43,0.322]},
    2015: {t:[10.362,0.319,3.83,6.463,3.48,1.256,0.329,0.44,0.938],c:[7.928,0.319,2.009,null,1.349,null,0.329,null,0.297],k:[2.434,null,1.821,6.463,2.131,null,null,0.44,0.641]},
    2019: {t:[10.188,0.23,3.379,6.585,3.512,1.039,0.326,0.378,0.687],c:[7.848,0.23,1.631,null,1.375,null,0.326,null,0.254],k:[2.34,null,1.748,6.585,2.137,null,null,0.378,0.432]},
    2021: {t:[10.102,0.195,3.249,6.954,3.32,1.178,0.416,0.378,0.529],c:[7.798,0.195,1.574,null,1.271,null,0.416,null,0.221],k:[2.303,null,1.675,6.954,2.049,null,null,0.378,0.308]},
  },
  FIN: {
    2005: {t:[8.119,0.859,3.659,5.016,2.835,0.866,1.922,0.265,0.503],c:[7.205,0.858,2.797,null,1.526,null,1.922,null,0.286],k:[0.914,0.001,0.863,5.016,1.309,null,null,0.265,0.217]},
    2010: {t:[9.998,0.886,3.882,5.48,3.102,0.995,1.927,0.491,0.757],c:[8.882,0.885,2.827,null,1.567,null,1.927,null,0.36],k:[1.116,0.001,1.055,5.48,1.535,null,null,0.491,0.397]},
    2015: {t:[12.325,0.827,3.614,6.011,3.103,0.999,2.362,0.69,0.879],c:[10.775,0.826,2.387,null,1.408,null,2.362,null,0.432],k:[1.551,0.001,1.227,6.011,1.695,null,null,0.69,0.448]},
    2019: {t:[12.789,0.752,3.175,5.83,2.906,0.922,1.515,0.883,0.855],c:[11.262,0.75,1.948,null,1.113,null,1.515,null,0.432],k:[1.527,0.002,1.227,5.83,1.793,null,null,0.883,0.423]},
    2021: {t:[13.006,0.727,3.143,6.468,3.09,0.838,1.872,0.9,0.976],c:[11.451,0.725,1.896,null,1.117,null,1.872,null,0.418],k:[1.555,0.002,1.246,6.468,1.973,null,null,0.9,0.559]},
  },
  NOR: {
    2005: {t:[6.18,0.296,4.287,5.125,2.78,0.717,0.519,0.14,0.621],c:[4.453,0.291,3.528,null,1.539,null,0.519,null,0.3],k:[1.727,0.005,0.759,5.125,1.241,null,null,0.14,0.321]},
    2010: {t:[6.982,0.284,4.157,5.56,3.132,0.617,0.486,0.146,0.637],c:[5.041,0.278,3.614,null,1.432,null,0.486,null,0.324],k:[1.941,0.006,0.543,5.56,1.701,null,null,0.146,0.313]},
    2015: {t:[8.578,0.262,4.295,6.397,3.246,0.514,0.443,0.126,0.67],c:[6.364,0.256,3.73,null,1.353,null,0.443,null,0.344],k:[2.214,0.006,0.566,6.397,1.894,null,null,0.126,0.326]},
    2019: {t:[9.203,0.24,4.483,6.526,3.157,0.398,0.264,0.123,0.662],c:[6.782,0.233,3.876,null,1.214,null,0.264,null,0.343],k:[2.421,0.006,0.607,6.526,1.944,null,null,0.123,0.318]},
    2021: {t:[8.427,0.213,4.04,6.259,2.78,0.377,0.638,0.107,0.518],c:[6.256,0.207,3.497,null,1.108,null,0.638,null,0.253],k:[2.172,0.006,0.543,6.259,1.672,null,null,0.107,0.265]},
  },
  FRA: {
    2005: {t:[10.634,1.732,1.804,8.055,2.941,0.905,1.679,0.792,0.352],c:[10.316,1.731,1.632,null,1.356,null,1.679,null,0.348],k:[0.318,0,0.172,8.055,1.584,null,null,0.792,0.003]},
    2010: {t:[11.925,1.681,1.619,8.557,2.92,1.066,1.594,0.822,0.785],c:[11.495,1.679,1.543,null,1.61,null,1.594,null,0.678],k:[0.43,0.001,0.075,8.557,1.31,null,null,0.822,0.107]},
    2015: {t:[12.558,1.642,1.676,8.712,2.924,0.938,1.609,0.83,0.815],c:[12.139,1.64,1.594,null,1.498,null,1.609,null,0.711],k:[0.419,0.001,0.082,8.712,1.426,null,null,0.83,0.103]},
    2019: {t:[12.38,1.52,1.706,8.514,2.719,0.697,1.497,0.693,1.033],c:[11.958,1.518,1.624,null,1.339,null,1.497,null,0.935],k:[0.421,0.002,0.082,8.514,1.38,null,null,0.693,0.098]},
    2021: {t:[12.519,1.481,1.792,9.654,2.655,0.822,1.949,0.632,1.216],c:[12.102,1.479,1.706,null,1.303,null,1.949,null,1.114],k:[0.416,0.001,0.086,9.654,1.353,null,null,0.632,0.101]},
  },
  DEU: {
    2005: {t:[9.483,2.238,1.707,7.134,2.013,1.1,1.804,0.623,0.119],c:[8.945,2.231,1.288,null,1.326,null,1.804,null,0.078],k:[0.539,0.007,0.418,7.134,0.687,null,null,0.623,0.04]},
    2010: {t:[9.291,2.01,1.679,8.499,2.136,0.883,1.438,0.649,0.099],c:[8.703,2.004,1.252,null,1.243,null,1.438,null,0.069],k:[0.588,0.006,0.426,8.499,0.894,null,null,0.649,0.03]},
    2015: {t:[9.077,1.771,1.71,8.642,2.21,0.629,0.901,0.546,0.236],c:[8.452,1.765,1.291,null,1.099,null,0.901,null,0.127],k:[0.625,0.006,0.419,8.642,1.111,null,null,0.546,0.109]},
    2019: {t:[9.515,1.698,1.828,8.961,2.37,0.583,0.779,0.488,0.187],c:[8.811,1.692,1.374,null,1.049,null,0.779,null,0.111],k:[0.704,0.006,0.454,8.961,1.321,null,null,0.488,0.076]},
    2021: {t:[9.936,1.687,1.955,9.994,2.645,0.562,1.404,0.528,0.156],c:[9.11,1.681,1.46,null,1.208,null,1.404,null,0.085],k:[0.826,0.006,0.495,9.994,1.436,null,null,0.528,0.071]},
  },
  GBR: {
    2005: {t:[7.185,0.432,2.084,6.694,2.838,0.384,0.226,1.252,0.165],c:[6.683,0.432,1.728,null,1.929,null,0.226,null,0.144],k:[0.502,0,0.356,6.694,0.909,null,null,1.252,0.022]},
    2010: {t:[8.724,0.082,1.965,7.929,3.927,0.376,0.367,1.663,0.202],c:[8.226,0.082,1.516,null,2.549,null,0.367,null,0.182],k:[0.499,0,0.449,7.929,1.378,null,null,1.663,0.02]},
    2015: {t:[8.624,0.065,1.827,7.77,3.439,0.187,0.171,1.513,0.103],c:[8.288,0.065,1.512,null,2.214,null,0.171,null,0.093],k:[0.337,0,0.314,7.77,1.224,null,null,1.513,0.01]},
    2019: {t:[7.815,0.072,1.731,8.005,2.435,0.153,0.08,1.125,0.835],c:[7.433,0.072,1.345,null,1.455,null,0.08,null,0.835],k:[0.382,0,0.386,8.005,0.98,null,null,1.125,null]},
    2021: {t:[7.703,0.071,1.692,9.8,2.027,null,0.085,1.279,1.745],c:[7.301,0.071,1.286,null,1.051,null,0.085,null,1.745],k:[0.402,0,0.407,9.8,0.976,null,null,1.279,null]},
  },
  USA: {
    2005: {t:[5.063,0.72,1.007,6.736,0.706,0.132,0.257,0.292,0.579],c:[5.021,0.72,1.007,null,0.119,null,0.257,null,0.308],k:[0.042,null,null,6.736,0.588,null,null,0.292,0.271]},
    2010: {t:[5.915,0.725,1.202,7.962,0.75,0.16,1.057,0.386,0.889],c:[5.865,0.725,1.202,null,0.1,null,1.057,null,0.386],k:[0.05,null,null,7.962,0.65,null,null,0.386,0.504]},
    2015: {t:[6.387,0.655,1.134,8.339,0.64,0.104,0.178,0.258,0.788],c:[6.329,0.655,1.134,null,0.076,null,0.178,null,0.349],k:[0.058,null,null,8.339,0.564,null,null,0.258,0.439]},
    2019: {t:[6.504,0.599,0.976,8.408,0.616,0.102,0.147,0.232,0.619],c:[6.443,0.599,0.976,null,0.057,null,0.147,null,0.303],k:[0.061,null,null,8.408,0.559,null,null,0.232,0.315]},
    2021: {t:[6.63,0.579,0.879,9.496,0.622,1.349,0.928,0.236,0.9],c:[6.564,0.579,0.879,null,0.054,null,0.928,null,0.296],k:[0.065,null,null,9.496,0.568,null,null,0.236,0.603]},
  },
  KOR: {
    2005: {t:[1.224,0.227,0.497,2.384,0.214,0.103,0.176,0.279,0.404],c:[1.133,0.222,0.325,null,0.01,null,0.176,null,0.315],k:[0.091,0.005,0.172,2.384,0.204,null,null,0.279,0.089]},
    2010: {t:[1.717,0.26,0.481,3.204,0.642,0.277,0.267,0.123,0.403],c:[1.626,0.26,0.318,null,0.044,null,0.267,null,0.317],k:[0.091,0,0.163,3.204,0.598,null,null,0.123,0.085]},
    2015: {t:[2.433,0.277,0.529,3.508,1.074,0.318,0.261,0.171,0.48],c:[2.342,0.277,0.326,null,0.162,null,0.261,null,0.401],k:[0.09,null,0.202,3.508,0.912,null,null,0.171,0.079]},
    2019: {t:[2.909,0.345,0.668,4.432,1.296,0.347,0.419,0.32,0.688],c:[2.775,0.321,0.371,null,0.303,null,0.419,null,0.556],k:[0.135,0.024,0.297,4.432,0.992,null,null,0.32,0.132]},
    2021: {t:[3.358,0.402,0.873,5.086,1.616,0.637,1.378,0.438,1.433],c:[3.183,0.379,0.451,null,0.349,null,1.378,null,1.011],k:[0.176,0.023,0.422,5.086,1.267,null,null,0.438,0.422]},
  },
  ITA: {
    2005: {t:[11.375,2.396,1.47,6.431,1.2,0.532,0.467,0.013,0.085],c:[11.278,2.395,1.398,null,0.596,null,0.467,null,0.025],k:[0.096,0.001,0.072,6.431,0.603,null,null,0.013,0.06]},
    2010: {t:[12.93,2.51,1.668,6.953,1.315,0.415,0.869,0.031,0.136],c:[12.799,2.509,1.567,null,0.658,null,0.869,null,0.05],k:[0.132,0.001,0.101,6.953,0.656,null,null,0.031,0.086]},
    2015: {t:[13.406,2.66,1.779,6.561,1.386,0.5,1.135,0.04,0.721],c:[13.305,2.66,1.702,null,0.72,null,1.135,null,0.596],k:[0.101,0,0.076,6.561,0.666,null,null,0.04,0.125]},
    2019: {t:[13.273,2.494,1.737,6.357,1.407,0.272,1.081,0.033,0.965],c:[13.194,2.494,1.67,null,0.756,null,1.081,null,0.803],k:[0.079,0,0.067,6.357,0.651,null,null,0.033,0.162]},
    2021: {t:[13.66,2.503,1.863,6.88,1.425,0.442,1.46,0.041,1.559],c:[13.586,2.503,1.78,null,0.837,null,1.46,null,1.397],k:[0.074,0,0.083,6.88,0.588,null,null,0.041,0.161]},
  },
  CAN: {
    2005: {t:[4.405,0.395,0.902,6.096,1.062,0.312,0.605,0.418,2.547],c:[4.405,0.395,0.902,null,0.864,null,0.605,null,2.25],k:[null,null,null,6.096,0.198,null,null,0.418,0.297]},
    2010: {t:[4.734,0.377,0.878,7.363,1.263,0.326,0.79,0.426,2.268],c:[4.734,0.377,0.878,null,1.044,null,0.79,null,1.888],k:[null,null,null,7.363,0.22,null,null,0.426,0.38]},
    2015: {t:[5.278,0.348,0.755,7.601,1.555,0.236,0.621,0.305,2.194],c:[5.278,0.348,0.755,null,1.321,null,0.621,null,1.864],k:[null,null,null,7.601,0.233,null,null,0.305,0.33]},
    2019: {t:[5.751,0.327,0.738,7.764,1.758,0.411,0.502,0.266,2.329],c:[5.751,0.327,0.738,null,1.474,null,0.502,null,1.94],k:[null,null,null,7.764,0.284,null,null,0.266,0.389]},
    2021: {t:[5.831,0.297,0.698,8.802,1.571,0.919,1.125,0.298,2.317],c:[5.831,0.297,0.698,null,1.281,null,1.125,null,1.929],k:[null,null,null,8.802,0.29,null,null,0.298,0.389]},
  },
  NLD: {
    2005: {t:[5.956,0.503,2.776,6.199,1.589,1.157,1.052,0.31,0.966],c:[5.152,0.503,2.614,null,0.604,null,1.052,null,0.882],k:[0.804,null,0.162,6.199,0.985,null,null,0.31,0.084]},
    2010: {t:[6.446,0.402,2.792,3.076,1.597,1.088,1.002,0.349,1.566],c:[5.543,0.402,2.428,null,0.69,null,1.002,null,1.509],k:[0.903,null,0.364,3.076,0.906,null,null,0.349,0.057]},
    2015: {t:[7.289,0.342,2.93,2.676,1.438,0.746,1.248,0.444,1.488],c:[6.446,0.342,2.124,null,0.736,null,1.248,null,1.396],k:[0.843,null,0.806,2.676,0.703,null,null,0.444,0.092]},
    2019: {t:[6.981,0.292,2.815,2.788,1.543,0.553,0.699,0.428,1.419],c:[6.077,0.292,1.98,null,0.707,null,0.699,null,1.343],k:[0.904,null,0.835,2.788,0.836,null,null,0.428,0.077]},
    2021: {t:[7.192,0.272,2.777,3.81,1.62,1.509,0.709,0.449,1.417],c:[6.172,0.272,1.992,null,0.733,null,0.709,null,1.342],k:[1.02,null,0.784,3.81,0.887,null,null,0.449,0.075]},
  },
  OECD: {
    2005: {t:[6.307,0.898,2,5.236,1.842,0.462,0.739,0.301,0.466],c:[5.865,0.915,1.686,null,1.127,null,0.739,null,0.33],k:[0.476,0.009,0.341,5.236,0.713,null,null,0.301,0.149]},
    2010: {t:[7.212,0.916,2.068,5.856,2.156,0.541,0.94,0.376,0.538],c:[6.766,0.934,1.702,null,1.293,null,0.94,null,0.388],k:[0.482,0.008,0.397,5.856,0.862,null,null,0.376,0.164]},
    2015: {t:[7.587,0.868,1.973,5.737,2.057,0.468,0.705,0.351,0.543],c:[7.138,0.886,1.581,0,1.113,null,0.705,0,0.383],k:[0.487,0.007,0.426,5.737,0.944,null,0,0.351,0.174]},
    2019: {t:[7.58,0.791,1.97,5.856,2.095,0.561,0.564,0.327,0.554],c:[7.108,0.807,1.56,0,1.119,null,0.564,0,0.409],k:[0.498,0.007,0.458,5.856,0.976,null,0,0.327,0.164]},
    2021: {t:[7.746,0.785,2.043,6.637,2.314,0.622,1.034,0.331,0.673],c:[7.263,0.8,1.609,0,1.327,null,1.034,0,0.487],k:[0.51,0.008,0.485,6.637,0.987,null,0,0.331,0.21]},
  },
};

const YEARS = [2005, 2010, 2015, 2019, 2021];
const CAT_COLORS = ["#dc2626","#f97316","#a855f7","#eab308","#22c55e","#0ea5e9","#6366f1","#8b5cf6","#ec4899"];
const VM_LABELS = { total: "合計", cash: "現金給付", inkind: "現物給付" };

// ── Helpers ──
// For a given view mode, return the appropriate array key
function vmKey(vm) { return vm === "cash" ? "c" : vm === "inkind" ? "k" : "t"; }

// Get structured data. null values in the source are preserved.
function getData(code, year, vm = "total") {
  const yd = RAW_DATA[code]?.[year];
  if (!yd) return null;
  const arr = yd[vmKey(vm)];
  const obj = {};
  let total = 0;
  CATEGORIES.forEach((c, i) => {
    const v = arr[i];
    obj[c.key] = v;
    if (v !== null && !isNaN(v)) total += v;
  });
  obj.total = +total.toFixed(3);
  return obj;
}

// Get cash/in-kind split with per-category breakdown
function getSplit(code, year) {
  const yd = RAW_DATA[code]?.[year];
  if (!yd) return null;
  let cashTotal = 0, inkindTotal = 0, grandTotal = 0;
  const byCat = {};
  CATEGORIES.forEach((c, i) => {
    const t = yd.t[i] ?? 0;
    const ca = yd.c[i];
    const ki = yd.k[i];
    // If a spending-type value is null but total exists, treat null as 0 for composition
    const caVal = ca ?? 0;
    const kiVal = ki ?? 0;
    cashTotal += caVal;
    inkindTotal += kiVal;
    grandTotal += t;
    byCat[c.key] = { cash: caVal, inkind: kiVal, total: t, cashIsNull: ca === null, inkindIsNull: ki === null };
  });
  return {
    cashTotal: +cashTotal.toFixed(3),
    inkindTotal: +inkindTotal.toFixed(3),
    total: +grandTotal.toFixed(3),
    byCat,
  };
}

// ── UI components ──
function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "10px 16px", border: "none",
      borderBottom: active ? "3px solid #c0392b" : "3px solid transparent",
      background: active ? "rgba(192,57,43,0.08)" : "transparent",
      color: active ? "#8e1a0e" : "#6b7280",
      fontWeight: active ? 700 : 500, fontSize: "13px", cursor: "pointer",
      fontFamily: "'Noto Sans JP', sans-serif", transition: "all 0.2s",
      letterSpacing: "0.02em", whiteSpace: "nowrap",
    }}>{label}</button>
  );
}

function Chip({ code, selected, onClick }) {
  const c = COUNTRIES[code];
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "5px 12px", borderRadius: "20px",
      border: selected ? `2px solid ${c.color}` : "2px solid #e5e7eb",
      background: selected ? `${c.color}12` : "#fff",
      color: selected ? c.color : "#9ca3af",
      fontWeight: selected ? 600 : 400, fontSize: "13px", cursor: "pointer",
      fontFamily: "'Noto Sans JP', sans-serif", transition: "all 0.15s",
    }}><span>{c.flag}</span><span>{c.ja}</span></button>
  );
}

function VMToggle({ vm, set }) {
  const modes = [
    { key: "total", label: "合計", icon: "Σ", bg: "#1a1a2e" },
    { key: "cash", label: "現金給付", icon: "💴", bg: "#92400e" },
    { key: "inkind", label: "現物給付", icon: "🏥", bg: "#0e7490" },
  ];
  return (
    <div style={{ display: "inline-flex", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
      {modes.map(m => (
        <button key={m.key} onClick={() => set(m.key)} style={{
          padding: "7px 14px", border: "none",
          background: vm === m.key ? m.bg : "#f9fafb",
          color: vm === m.key ? "#fff" : "#6b7280",
          fontWeight: vm === m.key ? 700 : 400, fontSize: "12px", cursor: "pointer",
          fontFamily: "'Noto Sans JP', sans-serif", transition: "all 0.15s",
          display: "flex", alignItems: "center", gap: "4px",
        }}><span style={{ fontSize: "13px" }}>{m.icon}</span><span>{m.label}</span></button>
      ))}
    </div>
  );
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(255,255,255,0.97)", border: "1px solid #e5e7eb",
      borderRadius: "8px", padding: "12px 16px", fontSize: "13px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontFamily: "'Noto Sans JP', sans-serif", maxWidth: 320,
    }}>
      <div style={{ fontWeight: 700, marginBottom: "6px", color: "#1f2937" }}>{label}</div>
      {payload.filter(p => p.value !== null && p.value !== undefined && !isNaN(p.value)).map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, display: "inline-block", flexShrink: 0 }} />
          <span style={{ color: "#6b7280", flexShrink: 0 }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: "#1f2937" }}>{typeof p.value === "number" ? p.value.toFixed(2) : p.value}%</span>
        </div>
      ))}
    </div>
  );
}

function Card({ title, sub, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", border: "1px solid #f0eeeb" }}>
      <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 4px", color: "#1f2937" }}>{title}</h3>
      {sub && <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 16px" }}>{sub}</p>}
      {children}
    </div>
  );
}

// ── App ──
export default function App() {
  const [tab, setTab] = useState("compare");
  const [sel, setSel] = useState(["JPN", "DNK", "SWE", "FRA", "DEU", "USA", "OECD"]);
  const [yr, setYr] = useState(2021);
  const [cat, setCat] = useState("total");
  const [vm, setVm] = useState("total");
  const [hov, setHov] = useState(null);

  const toggle = (c) => setSel(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);

  const downloadExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();

    const header = ["国", "ISOコード", ...CATEGORIES.map(c => c.ja), "合計"];
    const rows = sel.map(code => {
      const d = getData(code, yr, vm);
      if (!d) return null;
      return [COUNTRIES[code].ja, code, ...CATEGORIES.map(c => d[c.key] ?? ""), d.total];
    }).filter(Boolean).sort((a, b) => b[b.length - 1] - a[a.length - 1]);
    const ws1 = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws1["!cols"] = [{ wch: 14 }, { wch: 6 }, ...CATEGORIES.map(() => ({ wch: 10 })), { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws1, `${VM_LABELS[vm]}（${yr}年）`);

    const header2 = ["国", "ISOコード",
      ...CATEGORIES.flatMap(c => [`${c.ja}(現金)`, `${c.ja}(現物)`]),
      "現金合計", "現物合計", "総合計", "現金比率(%)"];
    const rows2 = sel.map(code => {
      const s = getSplit(code, yr);
      if (!s) return null;
      const catVals = CATEGORIES.flatMap(c => [
        s.byCat[c.key].cashIsNull ? "" : s.byCat[c.key].cash,
        s.byCat[c.key].inkindIsNull ? "" : s.byCat[c.key].inkind,
      ]);
      const ratio = s.total > 0 ? +((s.cashTotal / s.total) * 100).toFixed(1) : 0;
      return [COUNTRIES[code].ja, code, ...catVals, s.cashTotal, s.inkindTotal, s.total, ratio];
    }).filter(Boolean).sort((a, b) => b[b.length - 2] - a[a.length - 2]);
    const ws2 = XLSX.utils.aoa_to_sheet([header2, ...rows2]);
    ws2["!cols"] = [{ wch: 14 }, { wch: 6 }, ...header2.slice(2).map(() => ({ wch: 12 }))];
    XLSX.utils.book_append_sheet(wb, ws2, `現金vs現物（${yr}年）`);

    const header3 = ["国", "ISOコード", ...YEARS.map(y => `${y}年`)];
    const rows3 = sel.map(code => {
      return [COUNTRIES[code].ja, code, ...YEARS.map(y => {
        const d = getData(code, y, vm);
        return d ? d.total : "";
      })];
    });
    const ws3 = XLSX.utils.aoa_to_sheet([header3, ...rows3]);
    ws3["!cols"] = [{ wch: 14 }, { wch: 6 }, ...YEARS.map(() => ({ wch: 10 }))];
    XLSX.utils.book_append_sheet(wb, ws3, `時系列_${VM_LABELS[vm]}`);

    XLSX.writeFile(wb, `SOCX_${VM_LABELS[vm]}_${yr}.xlsx`);
  }, [sel, yr, vm]);

  const cmpData = useMemo(() =>
    sel.map(c => {
      const d = getData(c, yr, vm);
      if (!d) return null;
      const clean = { name: COUNTRIES[c].ja, code: c, total: d.total };
      CATEGORIES.forEach(ct => { clean[ct.key] = d[ct.key] ?? 0; });
      return clean;
    }).filter(Boolean).sort((a, b) => b.total - a.total),
  [sel, yr, vm]);

  const tsData = useMemo(() =>
    YEARS.map(y => {
      const row = { year: y };
      sel.forEach(c => {
        const d = getData(c, y, vm);
        if (d) row[c] = cat === "total" ? d.total : (d[cat] ?? null);
      });
      return row;
    }),
  [sel, cat, vm]);

  const rdrData = useMemo(() =>
    CATEGORIES.map(ct => {
      const row = { category: ct.ja };
      sel.forEach(c => {
        const d = getData(c, yr, vm);
        if (d) row[c] = d[ct.key] ?? 0;
      });
      return row;
    }),
  [sel, yr, vm]);

  const tblData = useMemo(() =>
    sel.map(c => {
      const d = getData(c, yr, vm);
      return d ? { code: c, ...d } : null;
    }).filter(Boolean),
  [sel, yr, vm]);

  const splitData = useMemo(() =>
    sel.map(c => {
      const s = getSplit(c, yr);
      return s ? { name: COUNTRIES[c].ja, code: c, ...s } : null;
    }).filter(Boolean).sort((a, b) => b.total - a.total),
  [sel, yr]);

  return (
    <div style={{ fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif", background: "#faf9f7", minHeight: "100vh", color: "#1f2937" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;900&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet" />

      <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", padding: "32px 24px 24px", color: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#94a3b8", marginBottom: "8px" }}>
            OECD Social Expenditure Database — Interactive Explorer
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 900, margin: 0, lineHeight: 1.3,
            background: "linear-gradient(90deg, #fff 0%, #e2e8f0 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>社会支出データベース</h1>
          <p style={{ fontSize: "14px", color: "#94a3b8", margin: "6px 0 0", fontWeight: 300 }}>
            OECD.Stat 実データによる加盟国の社会支出比較（対GDP比）　｜　現金給付・現物給付の構成分析対応
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ background: "#fff", borderRadius: "12px", padding: "16px 20px", margin: "20px 0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", border: "1px solid #f0eeeb" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#9ca3af", marginBottom: "10px", letterSpacing: "0.08em" }}>比較対象国を選択</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {Object.keys(COUNTRIES).map(c => <Chip key={c} code={c} selected={sel.includes(c)} onClick={() => toggle(c)} />)}
          </div>
        </div>

        <div style={{ display: "flex", gap: "2px", borderBottom: "1px solid #e5e7eb", marginBottom: "20px", overflowX: "auto" }}>
          <Tab label="📊 国別比較" active={tab === "compare"} onClick={() => setTab("compare")} />
          <Tab label="📈 時系列推移" active={tab === "timeseries"} onClick={() => setTab("timeseries")} />
          <Tab label="🕸️ レーダー" active={tab === "radar"} onClick={() => setTab("radar")} />
          <Tab label="💰 現金vs現物" active={tab === "split"} onClick={() => setTab("split")} />
          <Tab label="📋 データ表" active={tab === "table"} onClick={() => setTab("table")} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
          {tab !== "timeseries" && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: 500 }}>年次:</span>
              {YEARS.map(y => (
                <button key={y} onClick={() => setYr(y)} style={{
                  padding: "4px 14px", borderRadius: "6px", border: "none",
                  background: yr === y ? "#1a1a2e" : "#f3f4f6",
                  color: yr === y ? "#fff" : "#6b7280",
                  fontWeight: yr === y ? 600 : 400, fontSize: "13px", cursor: "pointer", transition: "all 0.15s",
                }}>{y}</button>
              ))}
            </div>
          )}
          {tab !== "split" && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: 500 }}>給付形態:</span>
              <VMToggle vm={vm} set={setVm} />
            </div>
          )}
        </div>

        {tab === "timeseries" && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
            <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: 500 }}>分野:</span>
            <button onClick={() => setCat("total")} style={{
              padding: "4px 12px", borderRadius: "6px", border: "none",
              background: cat === "total" ? "#1a1a2e" : "#f3f4f6",
              color: cat === "total" ? "#fff" : "#6b7280", fontWeight: 600, fontSize: "13px", cursor: "pointer",
            }}>合計</button>
            {CATEGORIES.map((ct, i) => (
              <button key={ct.key} onClick={() => setCat(ct.key)} style={{
                padding: "4px 12px", borderRadius: "6px", border: "none",
                background: cat === ct.key ? CAT_COLORS[i] : "#f3f4f6",
                color: cat === ct.key ? "#fff" : "#6b7280",
                fontWeight: cat === ct.key ? 600 : 400, fontSize: "12px", cursor: "pointer", transition: "all 0.15s",
              }}>{ct.ja}</button>
            ))}
          </div>
        )}

        {tab === "compare" && (
          <Card title={`社会支出の分野別構成〈${VM_LABELS[vm]}〉（${yr}年、対GDP比%）`} sub="各国の社会支出を分野ごとに積み上げ表示。現金給付モードでは保健・住宅など現物給付しか存在しない分野はゼロになります。">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={cmpData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} label={{ value: "% of GDP", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#9ca3af" } }} />
                <Tooltip content={<Tip />} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                {CATEGORIES.map((ct, i) => (
                  <Bar key={ct.key} dataKey={ct.key} stackId="a" fill={CAT_COLORS[i]} name={ct.ja} radius={i === CATEGORIES.length - 1 ? [3,3,0,0] : [0,0,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {tab === "timeseries" && (
          <Card
            title={`${cat === "total" ? "社会支出合計" : CATEGORIES.find(c => c.key === cat)?.ja}〈${VM_LABELS[vm]}〉の推移（対GDP比%）`}
            sub="2005年〜2021年の各国の推移を比較。OECD.Stat実データ。"
          >
            <ResponsiveContainer width="100%" height={420}>
              <AreaChart data={tsData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  {sel.map(c => (
                    <linearGradient key={c} id={`g-${c}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COUNTRIES[c].color} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={COUNTRIES[c].color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} label={{ value: "% of GDP", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#9ca3af" } }} />
                <Tooltip content={<Tip />} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                {sel.map(c => (
                  <Area key={c} type="monotone" dataKey={c} connectNulls
                    name={`${COUNTRIES[c].flag} ${COUNTRIES[c].ja}`}
                    stroke={COUNTRIES[c].color} strokeWidth={2.5} fill={`url(#g-${c})`}
                    dot={{ r: 4, fill: COUNTRIES[c].color, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        {tab === "radar" && (
          <Card
            title={`社会支出の構造比較〈${VM_LABELS[vm]}〉レーダーチャート（${yr}年）`}
            sub="各国の福祉供給モデルの違いが「形」として可視化されます。現金/現物切替でサービス偏重・移転偏重の構造差が明瞭に。"
          >
            <ResponsiveContainer width="100%" height={480}>
              <RadarChart data={rdrData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <PolarRadiusAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Tooltip content={<Tip />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                {sel.map(c => (
                  <Radar key={c} name={`${COUNTRIES[c].flag} ${COUNTRIES[c].ja}`}
                    dataKey={c} stroke={COUNTRIES[c].color} fill={COUNTRIES[c].color} fillOpacity={0.08} strokeWidth={2}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {tab === "split" && (
          <>
            <Card
              title={`現金給付 vs 現物給付の構成比較（${yr}年、対GDP比%）`}
              sub="各国の社会支出を現金給付（年金・手当等）と現物給付（医療・介護・保育・住宅サービス等）に分解。ALMPは内訳区分なしのため除外され、合計に差が出ます。"
            >
              <ResponsiveContainer width="100%" height={420}>
                <BarChart data={splitData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} label={{ value: "% of GDP", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#9ca3af" } }} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Bar dataKey="cashTotal" stackId="a" fill="#92400e" name="現金給付" />
                  <Bar dataKey="inkindTotal" stackId="a" fill="#0e7490" name="現物給付" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div style={{ marginTop: "20px" }}>
              <Card
                title={`現金給付比率の国際比較（${yr}年）`}
                sub="現金給付が社会支出に占める割合（%）。高いほど移転給付中心、低いほどサービス給付中心の福祉供給モデル。"
              >
                <ResponsiveContainer width="100%" height={Math.max(280, sel.length * 36)}>
                  <BarChart
                    data={splitData.map(d => {
                      const denom = d.cashTotal + d.inkindTotal;
                      return {
                        name: d.name, code: d.code,
                        cashRatio: denom > 0 ? +((d.cashTotal / denom) * 100).toFixed(1) : 0,
                        inkindRatio: denom > 0 ? +((d.inkindTotal / denom) * 100).toFixed(1) : 0,
                      };
                    }).sort((a, b) => b.cashRatio - a.cashRatio)}
                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} width={90} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="cashRatio" stackId="a" fill="#92400e" name="現金給付" />
                    <Bar dataKey="inkindRatio" stackId="a" fill="#0e7490" name="現物給付" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <div style={{ marginTop: "20px" }}>
              <Card
                title={`分野別・現金/現物の内訳（${yr}年、対GDP比%）`}
                sub="分野ごとに各国の現金給付と現物給付を並べて比較（OECD平均を除く上位4カ国）。保健は全額現物、失業はほぼ全額現金、家族は国により比率が大きく異なることが実データで確認できます。"
              >
                {sel.filter(c => c !== "OECD").slice(0, 4).map(code => {
                  const s = getSplit(code, yr);
                  if (!s) return null;
                  const catData = CATEGORIES.map(ct => ({
                    name: ct.ja,
                    cash: s.byCat[ct.key].cashIsNull ? 0 : s.byCat[ct.key].cash,
                    inkind: s.byCat[ct.key].inkindIsNull ? 0 : s.byCat[ct.key].inkind,
                  }));
                  return (
                    <div key={code} style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: COUNTRIES[code].color, marginBottom: "4px" }}>
                        {COUNTRIES[code].flag} {COUNTRIES[code].ja}
                      </div>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={catData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={0} />
                          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                          <Tooltip content={<Tip />} />
                          <Bar dataKey="cash" stackId="a" fill="#92400e" name="現金" />
                          <Bar dataKey="inkind" stackId="a" fill="#0e7490" name="現物" radius={[2,2,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
              </Card>
            </div>
          </>
        )}

        {tab === "table" && (
          <Card title={`詳細データ表〈${VM_LABELS[vm]}〉（${yr}年、対GDP比%）`} sub="選択国の全分野データを一覧表示。空白セル（—）はOECDで該当データが公表されていない項目（例: 保健の現金、失業の現物）。">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
              <button onClick={downloadExcel} style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "8px 18px", borderRadius: "8px", border: "1px solid #d1d5db",
                background: "linear-gradient(180deg, #fff 0%, #f9fafb 100%)",
                color: "#1f2937", fontWeight: 600, fontSize: "13px", cursor: "pointer",
                fontFamily: "'Noto Sans JP', sans-serif",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)"; e.currentTarget.style.borderColor = "#22c55e"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(180deg, #fff 0%, #f9fafb 100%)"; e.currentTarget.style.borderColor = "#d1d5db"; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Excelダウンロード（.xlsx）
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ textAlign: "left", padding: "10px 8px", color: "#6b7280", fontWeight: 600, fontSize: "12px", position: "sticky", left: 0, background: "#fff", zIndex: 1 }}>国</th>
                    {CATEGORIES.map((ct, i) => (
                      <th key={ct.key} style={{ textAlign: "right", padding: "10px 8px", color: CAT_COLORS[i], fontWeight: 600, fontSize: "11px", whiteSpace: "nowrap" }}>{ct.ja}</th>
                    ))}
                    <th style={{ textAlign: "right", padding: "10px 8px", color: "#1f2937", fontWeight: 700, fontSize: "12px", borderLeft: "2px solid #e5e7eb" }}>合計</th>
                  </tr>
                </thead>
                <tbody>
                  {tblData.sort((a, b) => b.total - a.total).map((row, ri) => (
                    <tr key={row.code}
                      onMouseEnter={() => setHov(row.code)} onMouseLeave={() => setHov(null)}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        background: hov === row.code ? "#faf5f0" : ri % 2 === 0 ? "#fff" : "#fafafa",
                        transition: "background 0.15s",
                      }}>
                      <td style={{ padding: "10px 8px", fontWeight: 600, whiteSpace: "nowrap", position: "sticky", left: 0, background: "inherit", zIndex: 1 }}>
                        {COUNTRIES[row.code].flag} {COUNTRIES[row.code].ja}
                      </td>
                      {CATEGORIES.map(ct => {
                        const val = row[ct.key];
                        const validVals = tblData.map(r => r[ct.key]).filter(v => v !== null && v !== undefined && !isNaN(v));
                        const mx = validVals.length > 0 ? Math.max(...validVals, 0.01) : 0.01;
                        const isNull = val === null || val === undefined;
                        return (
                          <td key={ct.key} style={{
                            textAlign: "right", padding: "10px 8px", fontVariantNumeric: "tabular-nums",
                            color: isNull ? "#d1d5db" : "inherit",
                            background: isNull ? "transparent"
                                       : vm === "cash" ? `rgba(146,64,14,${(val/mx)*0.15})`
                                       : vm === "inkind" ? `rgba(14,116,144,${(val/mx)*0.15})`
                                       : `rgba(192,57,43,${(val/mx)*0.12})`,
                          }}>{isNull ? "—" : val.toFixed(2)}</td>
                        );
                      })}
                      <td style={{ textAlign: "right", padding: "10px 8px", fontWeight: 700, borderLeft: "2px solid #e5e7eb", color: "#1a1a2e" }}>
                        {row.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <div style={{ padding: "24px 0 40px", fontSize: "11px", color: "#9ca3af", lineHeight: 1.8, borderTop: "1px solid #f0eeeb", marginTop: "24px" }}>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>データについて</div>
          <div>データはOECD.Stat のSOCX集計データセット（DSD_SOCX_AGG）から抽出した実数値です。指標は「公的社会支出（Public Social Expenditure）の対GDP比（%）」。</div>
          <div>分類はOECDの9分野区分（高齢、遺族、障害・業務災害・傷病、保健、家族、積極的労働市場政策、失業、住宅、その他）に準拠。現金給付（cash）/現物給付（in-kind）の区分はSOCXの spending type 分類による実数値で、分野によっては片方のみが存在します（例: 保健は全額現物、失業はほぼ全額現金、ALMPは内訳区分なし）。障害関連は現金（障害年金等）と現物（リハビリ等）の両方が存在します。</div>
          <div>最新年は2021年。2022年以降は各国の詳細な分野別・給付形態別データが未公表のため本アプリには収録していません。</div>
          <div style={{ marginTop: "4px", fontStyle: "italic" }}>
            原データ: <a href="https://data-explorer.oecd.org" target="_blank" rel="noopener" style={{ color: "#6366f1" }}>OECD Data Explorer</a> / Social Protection and Well-being → Social expenditure aggregates
          </div>
        </div>
      </div>
    </div>
  );
}
