/**
 * Parses domain string into structured object
 * {
 *  zoneName: 'example.com',
 *  zoneId: 'Z012345677890DADMMV',
 *  primaryName: 'primary.example.com',
 *  aliases: ['alias.example.com']
 * }
 * @param domains 'example.com,Z012345677890DADMMV,primary.example.com,alias.example.com'
 * @returns Domains object with at least one entry
 */
export function parseDomains(domains: string) {
  const parsedDomains = domains
    .split(';')
    .map((group) => group.split(',').map((entry) => entry.trim()))
    .filter((group) => group.length >= 3)
    .map((group) => ({
      zoneName: group[0],
      zoneId: group[1],
      primaryName: group[2],
      aliases: group.slice(3),
    }));
  if (parsedDomains.length === 0) {
    throw new Error(
      `No valid domains found in "${domains}". Domain must be in format: [zoneName],[zoneId],[primaryName],[...aliases];...`
    );
  }
  return parsedDomains;
}
