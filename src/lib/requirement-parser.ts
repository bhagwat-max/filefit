export type FileFormat = "jpeg" | "png" | "webp";

export type ParsedRequirement = {
  width?: number;
  height?: number;
  minKB?: number;
  maxKB?: number;
  format?: FileFormat;
};

function toKB(value: number, unit?: string) {
  if (!unit) return Math.round(value);

  return unit.toLowerCase() === "mb"
    ? Math.round(value * 1024)
    : Math.round(value);
}

export function parseRequirement(
  input: string
): ParsedRequirement {
  const text = input
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/–|—/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const result: ParsedRequirement = {};

  // FORMAT
  if (/\b(jpg|jpeg)\b/.test(text)) {
    result.format = "jpeg";
  } else if (/\bpng\b/.test(text)) {
    result.format = "png";
  } else if (/\bwebp\b/.test(text)) {
    result.format = "webp";
  }

  // DIMENSIONS
  // Example: 200 x 230 px
  const dimensions = text.match(
    /(\d{1,5})\s*x\s*(\d{1,5})\s*(?:px|pixels?)?/
  );

  if (dimensions) {
    result.width = Number(dimensions[1]);
    result.height = Number(dimensions[2]);
  }

  // BETWEEN RANGE
  // Example: between 20 KB and 50 KB
  const between = text.match(
    /between\s+(\d+(?:\.\d+)?)\s*(kb|mb)?\s+(?:and|to|-)\s+(\d+(?:\.\d+)?)\s*(kb|mb)/
  );

  if (between) {
    result.minKB = toKB(
      Number(between[1]),
      between[2] || between[4]
    );

    result.maxKB = toKB(
      Number(between[3]),
      between[4]
    );
  }

  // SIMPLE RANGE
  // Example: 20-50 KB
  if (
    result.minKB === undefined &&
    result.maxKB === undefined
  ) {
    const range = text.match(
      /(\d+(?:\.\d+)?)\s*(kb|mb)?\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(kb|mb)/
    );

    if (range) {
      result.minKB = toKB(
        Number(range[1]),
        range[2] || range[4]
      );

      result.maxKB = toKB(
        Number(range[3]),
        range[4]
      );
    }
  }

  // MAXIMUM
  // Example: under 100 KB
  if (result.maxKB === undefined) {
    const max = text.match(
      /(?:under|below|less than|maximum|max|up to|not more than)\s*(?:file size\s*)?(?:of\s*)?(\d+(?:\.\d+)?)\s*(kb|mb)/
    );

    if (max) {
      result.maxKB = toKB(
        Number(max[1]),
        max[2]
      );
    }
  }

  // MINIMUM
  // Example: at least 20 KB
  if (result.minKB === undefined) {
    const min = text.match(
      /(?:minimum|min|at least|more than)\s*(?:file size\s*)?(?:of\s*)?(\d+(?:\.\d+)?)\s*(kb|mb)/
    );

    if (min) {
      result.minKB = toKB(
        Number(min[1]),
        min[2]
      );
    }
  }

  return result;
}

export function hasRequirements(
  requirements: ParsedRequirement
): boolean {
  return Boolean(
    requirements.width !== undefined ||
      requirements.height !== undefined ||
      requirements.minKB !== undefined ||
      requirements.maxKB !== undefined ||
      requirements.format !== undefined
  );
}