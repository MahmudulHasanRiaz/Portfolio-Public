import { useState } from "react";
import { Play } from "lucide-react";
import { youtubeEmbed, youtubeThumb } from "../lib/youtube";

// In-page YouTube player. The facade shows the real thumbnail with a play
// button; clicking swaps it for the privacy-enhanced embed in the same
// frame, so the video plays inside the page. Audio-only releases never
// use this component.
export default function ReleasePlayer({
	youtubeId,
	title,
}: {
	youtubeId: string;
	title: string;
}) {
	const [playing, setPlaying] = useState(false);
	const thumb = youtubeThumb(youtubeId);

	return (
		<div>
			{playing ? (
				<iframe
					className="video-frame"
					src={`${youtubeEmbed(youtubeId)}?autoplay=1`}
					title={`Play ${title}`}
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowFullScreen
				/>
			) : (
				<button
					type="button"
					className="video-facade"
					onClick={() => setPlaying(true)}
					aria-label={`Play ${title}`}
				>
					{thumb ? <img src={thumb} alt={title} /> : null}
					<span className="play-btn">
						<Play size={28} fill="currentColor" />
					</span>
					<span
						style={{
							position: "absolute",
							left: "50%",
							bottom: 14,
							transform: "translateX(-50%)",
							color: "#fff",
							fontSize: 13,
							fontWeight: 600,
							textShadow: "0 1px 6px rgba(0,0,0,0.6)",
						}}
					>
						Play here
					</span>
				</button>
			)}
			<p style={{ margin: "10px 0 0", fontSize: 13 }}>
				<a
					href={`https://youtu.be/${youtubeId}`}
					target="_blank"
					rel="noreferrer"
				>
					Watch on YouTube
				</a>
			</p>
		</div>
	);
}
