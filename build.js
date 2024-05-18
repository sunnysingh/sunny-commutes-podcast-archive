import fs from "node:fs/promises";

console.info("Building...");

const episodes = await fs
  .readFile("./source/data.json", "utf8")
  .then((data) => JSON.parse(data).data);

await fs.mkdir(".build-output/episodes", { recursive: true });
await fs.mkdir(".build-output/assets", { recursive: true });

await fs.cp("./source/assets", "./.build-output/assets", { recursive: true });
await fs.copyFile("./source/favicon.ico", "./.build-output/favicon.ico");

const sourceIndexHtml = await fs.readFile("./source/index.html", "utf8");
const sourceEpisodeHtml = await fs.readFile("./source/episode.html", "utf8");
const episodesHtmlItems = [];
const episodePageCompilers = [];

for (const episode of episodes) {
  const url = `./episodes/${episode.slug}-${episode.id}`;
  episodesHtmlItems.push(`<li><a href="${url}">${episode.title}</a></li>`);

  episodePageCompilers.push(async () => {
    const hasHtmlDescription = episode.description.includes("<p>");
    const withParagraphDescription = hasHtmlDescription
      ? episode.description
      : `<p>${episode.description}</p>`;
    const withLineBreaksDescription = hasHtmlDescription
      ? withParagraphDescription.replaceAll("<p><br></p>", "")
      : withParagraphDescription.replaceAll("\n", "\n<br>");
    const withLinksDescription = hasHtmlDescription
      ? withLineBreaksDescription
      : withLineBreaksDescription.replace(
          /(https?:\/\/[^\s]+)/g,
          '<a href="$1">$1</a>'
        );
    const description = withLinksDescription
      .replaceAll("<strong>", "")
      .replaceAll("</strong>", "");

    const formattedDate = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(episode.publishedAt));

    const compiledEpisodeHtml = sourceEpisodeHtml
      .replaceAll("{TITLE}", episode.title)
      .replaceAll("{DESCRIPTION}", description)
      .replaceAll("{DATETIME}", episode.publishedAt)
      .replaceAll("{FORMATTED_DATE}", formattedDate)
      .replaceAll("{MEDIA_TYPE}", episode.mediaType)
      .replaceAll("{MEDIA_URL}", episode.mediaUrl);

    await fs.writeFile(
      `./.build-output/episodes/${episode.slug}-${episode.id}.html`,
      compiledEpisodeHtml
    );
  });
}

await Promise.all(episodePageCompilers.map((compile) => compile()));

const compiledIndexHtml = sourceIndexHtml.replaceAll(
  "{EPISODES}",
  episodesHtmlItems.join("")
);

await fs.writeFile("./.build-output/index.html", compiledIndexHtml);

console.info("Done");
