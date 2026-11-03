<?php
/**
 * Plugin Name:       REDI Page Editor
 * Description:       Puts the text of every marketing page into wp-admin. Adds one page per site page under Pages, grouped into tabs, and serves the values to the frontend. Any field left empty keeps the copy already on the site. Replaces REDI Home Editor.
 * Version:           2.0.1
 * Author:            Ethixweb
 * Requires at least: 6.0
 * Requires PHP:      7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Why this exists
 * ---------------
 * None of the page text was editable in WordPress. There were no pages for it
 * and the frontend never read /wp/v2/pages, so an editor had nothing to open
 * and every wording change came back to the developers.
 *
 * Why NOT redi/v1/page-copy
 * -------------------------
 * That route exists and returns this whole tree, but it is a frozen export:
 * its response still matches the repo as committed on 2026-09-04 because
 * nothing in wp-admin writes to it, and for a month it silently overrode
 * newer approved copy on the live site. Reusing it would rebuild that trap.
 *
 * The rule that stops it happening again
 * --------------------------------------
 * A field only overrides the site once an editor has actually typed into it.
 * Blank means "leave the approved copy alone", never "blank the section", so a
 * half-filled screen cannot empty a page. That single rule is the difference
 * between this and the export it replaces.
 *
 * Generated, not hand-written
 * ---------------------------
 * The field list below is produced from src/content/seed/pages.json by
 * scripts/wp-page-editor/build.mjs in the Redi-website repo. 120 definitions
 * kept by hand would drift from the site the first time the copy changed
 * shape, and a field whose path no longer resolves fails silently - the
 * editor types, saves, and nothing happens. Regenerating is how a new field
 * gets added; do not edit the list below by hand.
 *
 * Known limits
 * ------------
 * ACF here is the free edition: no Options Pages, no Repeaters. Hence a real
 * page per section rather than an options screen, and lists entered as one
 * textarea split on blank lines. Items inside structured lists (the process
 * steps, the value comparison) are editable individually but cannot be added
 * or removed from wp-admin, because their count is part of the layout.
 * Images, links and icons are deliberately not exposed.
 */

/** Editable text per page. Generated - see the note above. */
function redi_pages_manifest() {
	return array(
		'home' => array(
			'label'  => 'Home',
			'slug'   => 'redi-home',
			'fields' => array(
				array( 'name' => 'home_hero_kicker', 'path' => 'hero.kicker', 'type' => 'text', 'label' => 'Hero / Kicker', 'default' => '' ),
				array( 'name' => 'home_hero_headline', 'path' => 'hero.headline', 'type' => 'text', 'label' => 'Hero / Headline', 'default' => 'The National Standard for Site Readiness' ),
				array( 'name' => 'home_hero_paragraphs', 'path' => 'hero.paragraphs', 'type' => 'list', 'label' => 'Hero / Paragraphs', 'default' => 'Companies making location decisions move fast and eliminate sites early. Most sites are not ruled out because they are bad sites. They are ruled out because key information is missing, unclear or unverified when a site selector needs it.

REDI Sites is the first national site readiness designation program in the United States, developed in affiliation with the Site Selectors Guild. Every site that completes the process receives a designation reflecting its current level of investment readiness, telling site selectors exactly where it stands, and telling you what to do next.' ),
				array( 'name' => 'home_hero_ctaprimary_label', 'path' => 'hero.ctaPrimary.label', 'type' => 'text', 'label' => 'Hero / CTA Primary / Label', 'default' => 'Explore Sites' ),
				array( 'name' => 'home_hero_ctasecondary_label', 'path' => 'hero.ctaSecondary.label', 'type' => 'text', 'label' => 'Hero / CTA Secondary / Label', 'default' => 'Register Your Site' ),
				array( 'name' => 'home_hero_mapctalabel', 'path' => 'hero.mapCtaLabel', 'type' => 'text', 'label' => 'Hero / Map CTA Label', 'default' => 'View all sites' ),
				array( 'name' => 'home_featured_eyebrow', 'path' => 'featured.eyebrow', 'type' => 'text', 'label' => 'Featured / Eyebrow', 'default' => 'Available Now' ),
				array( 'name' => 'home_featured_heading', 'path' => 'featured.heading', 'type' => 'text', 'label' => 'Featured / Heading', 'default' => 'Featured Sites' ),
				array( 'name' => 'home_featured_body', 'path' => 'featured.body', 'type' => 'text', 'label' => 'Featured / Body', 'default' => 'Our comprehensive approach to site selection ensures maximum returns for our investment partners.' ),
				array( 'name' => 'home_featured_viewalllabel', 'path' => 'featured.viewAllLabel', 'type' => 'text', 'label' => 'Featured / View All Label', 'default' => 'View All' ),
				array( 'name' => 'home_featured_viewsiteslabel', 'path' => 'featured.viewSitesLabel', 'type' => 'text', 'label' => 'Featured / View Sites Label', 'default' => 'View Sites' ),
				array( 'name' => 'home_statementofvalue_eyebrow', 'path' => 'statementOfValue.eyebrow', 'type' => 'text', 'label' => 'Statement of Value / Eyebrow', 'default' => 'What We Deliver' ),
				array( 'name' => 'home_statementofvalue_heading', 'path' => 'statementOfValue.heading', 'type' => 'text', 'label' => 'Statement of Value / Heading', 'default' => 'Statement of Value' ),
				array( 'name' => 'home_statementofvalue_paragraphs', 'path' => 'statementOfValue.paragraphs', 'type' => 'list', 'label' => 'Statement of Value / Paragraphs', 'default' => 'REDI Sites empowers communities to compete for investment. We evaluate industrial sites against one consistent national standard, developed and governed by the Site Selectors Guild and informed by the expertise of active Certified Site Selection Consultants®. Each site is reviewed across utilities, environmental, ownership and entitlements, ease of development, and logistics, so its readiness is documented, not assumed.

Every site that completes the process receives a designation that reflects where it stands today, from Emerging to Platinum. Every level is an achievement. Each designation comes with actionable feedback and a clear path to improve and advance, giving communities a roadmap for their readiness journey and site selectors credible, up-to-date site intelligence they can trust.

Designated sites are searchable on a public platform that puts qualified properties in front of companies, brokers, and site selection professionals, with the documentation to back them up. With REDI Sites, your site isn\'t just a dot on a map. It\'s ready to be found, and ready to compete.' ),
				array( 'name' => 'home_valuecompare_available_title', 'path' => 'valueCompare.available.title', 'type' => 'text', 'label' => 'Value Compare / Available / Title', 'default' => 'Available' ),
				array( 'name' => 'home_valuecompare_available_meanslabel', 'path' => 'valueCompare.available.meansLabel', 'type' => 'text', 'label' => 'Value Compare / Available / Means Label', 'default' => 'Means' ),
				array( 'name' => 'home_valuecompare_available_meansitem', 'path' => 'valueCompare.available.meansItem', 'type' => 'text', 'label' => 'Value Compare / Available / Means Item', 'default' => 'There\'s a price tag' ),
				array( 'name' => 'home_valuecompare_available_doesnttelllabel', 'path' => 'valueCompare.available.doesntTellLabel', 'type' => 'text', 'label' => 'Value Compare / Available / Doesn\'t Tell Label', 'default' => 'Doesn\'t tell you' ),
				array( 'name' => 'home_valuecompare_available_doesnttellitems', 'path' => 'valueCompare.available.doesntTellItems', 'type' => 'list', 'label' => 'Value Compare / Available / Doesn\'t Tell Items', 'default' => 'Whether utilities can actually serve the site

If the environmental record is clear

Whether title and ownership are clean

What\'s actually beneath the surface

How a company gets in and out' ),
				array( 'name' => 'home_valuecompare_ready_title', 'path' => 'valueCompare.ready.title', 'type' => 'text', 'label' => 'Value Compare / Ready / Title', 'default' => 'Ready' ),
				array( 'name' => 'home_valuecompare_ready_hasbeenlabel', 'path' => 'valueCompare.ready.hasBeenLabel', 'type' => 'text', 'label' => 'Value Compare / Ready / Has Been Label', 'default' => 'Has been independently evaluated on' ),
				array( 'name' => 'home_valuecompare_ready_items_0_label', 'path' => 'valueCompare.ready.items[0].label', 'type' => 'text', 'label' => 'Value Compare / Ready / Items 1 / Label', 'default' => 'Utilities' ),
				array( 'name' => 'home_valuecompare_ready_items_0_description', 'path' => 'valueCompare.ready.items[0].description', 'type' => 'text', 'label' => 'Value Compare / Ready / Items 1 / Description', 'default' => 'Confirmed capacity with a path to the site' ),
				array( 'name' => 'home_valuecompare_ready_items_1_label', 'path' => 'valueCompare.ready.items[1].label', 'type' => 'text', 'label' => 'Value Compare / Ready / Items 2 / Label', 'default' => 'Environmental' ),
				array( 'name' => 'home_valuecompare_ready_items_1_description', 'path' => 'valueCompare.ready.items[1].description', 'type' => 'text', 'label' => 'Value Compare / Ready / Items 2 / Description', 'default' => 'Record independently reviewed and cleared' ),
				array( 'name' => 'home_valuecompare_ready_items_2_label', 'path' => 'valueCompare.ready.items[2].label', 'type' => 'text', 'label' => 'Value Compare / Ready / Items 3 / Label', 'default' => 'Ownership & Entitlements' ),
				array( 'name' => 'home_valuecompare_ready_items_2_description', 'path' => 'valueCompare.ready.items[2].description', 'type' => 'text', 'label' => 'Value Compare / Ready / Items 3 / Description', 'default' => 'Title is clean, authority to sell is documented' ),
				array( 'name' => 'home_valuecompare_ready_items_3_label', 'path' => 'valueCompare.ready.items[3].label', 'type' => 'text', 'label' => 'Value Compare / Ready / Items 4 / Label', 'default' => 'Ease of Development' ),
				array( 'name' => 'home_valuecompare_ready_items_3_description', 'path' => 'valueCompare.ready.items[3].description', 'type' => 'text', 'label' => 'Value Compare / Ready / Items 4 / Description', 'default' => 'Ground studied, floodplain mapped, site cleared' ),
				array( 'name' => 'home_valuecompare_ready_items_4_label', 'path' => 'valueCompare.ready.items[4].label', 'type' => 'text', 'label' => 'Value Compare / Ready / Items 5 / Label', 'default' => 'Logistics' ),
				array( 'name' => 'home_valuecompare_ready_items_4_description', 'path' => 'valueCompare.ready.items[4].description', 'type' => 'text', 'label' => 'Value Compare / Ready / Items 5 / Description', 'default' => 'Highway access and ingress/egress documented' ),
				array( 'name' => 'home_valuecompare_ready_footnote', 'path' => 'valueCompare.ready.footnote', 'type' => 'text', 'label' => 'Value Compare / Ready / Footnote', 'default' => 'Visibility matters. But readiness is what gives visibility value.' ),
				array( 'name' => 'home_whychoose_eyebrow', 'path' => 'whyChoose.eyebrow', 'type' => 'text', 'label' => 'Why Choose / Eyebrow', 'default' => 'The Value' ),
				array( 'name' => 'home_whychoose_heading', 'path' => 'whyChoose.heading', 'type' => 'text', 'label' => 'Why Choose / Heading', 'default' => 'Why Designate a Site?' ),
				array( 'name' => 'home_whychoose_body', 'path' => 'whyChoose.body', 'type' => 'textarea', 'label' => 'Why Choose / Body', 'default' => 'A REDI Sites designation puts your site in front of the people who move projects forward, and gives you a clear plan for what comes next.' ),
				array( 'name' => 'home_whychoose_ctalabel', 'path' => 'whyChoose.ctaLabel', 'type' => 'text', 'label' => 'Why Choose / CTA Label', 'default' => 'About Us' ),
				array( 'name' => 'home_rediscore_eyebrow', 'path' => 'rediScore.eyebrow', 'type' => 'text', 'label' => 'REDI Score / Eyebrow', 'default' => 'Site Rating System' ),
				array( 'name' => 'home_rediscore_heading', 'path' => 'rediScore.heading', 'type' => 'text', 'label' => 'REDI Score / Heading', 'default' => 'The REDI Score' ),
				array( 'name' => 'home_rediscore_body', 'path' => 'rediScore.body', 'type' => 'textarea', 'label' => 'REDI Score / Body', 'default' => 'Every site is scored on a 10-point readiness scale built from five weighted categories: utilities, ownership and entitlements, environmental, ease of development, and logistics. The score reflects documented, verified readiness.' ),
				array( 'name' => 'home_rediscore_ctalabel', 'path' => 'rediScore.ctaLabel', 'type' => 'text', 'label' => 'REDI Score / CTA Label', 'default' => 'See More' ),
				array( 'name' => 'home_ctainvest_heading', 'path' => 'ctaInvest.heading', 'type' => 'text', 'label' => 'CTA Invest / Heading', 'default' => 'Is your site ready?' ),
				array( 'name' => 'home_ctainvest_body', 'path' => 'ctaInvest.body', 'type' => 'text', 'label' => 'CTA Invest / Body', 'default' => 'Take the first step toward a REDI Sites designation and greater credibility, visibility, and investment readiness.' ),
				array( 'name' => 'home_ctainvest_ctalabel', 'path' => 'ctaInvest.ctaLabel', 'type' => 'text', 'label' => 'CTA Invest / CTA Label', 'default' => 'Register your site' ),
			),
		),
		'about' => array(
			'label'  => 'About',
			'slug'   => 'redi-about',
			'fields' => array(
				array( 'name' => 'about_hero_heading', 'path' => 'hero.heading', 'type' => 'text', 'label' => 'Hero / Heading', 'default' => 'Who We Are' ),
				array( 'name' => 'about_hero_body', 'path' => 'hero.body', 'type' => 'textarea', 'label' => 'Hero / Body', 'default' => 'REDI Sites is an initiative of the Site Selectors Guild dedicated to improving investment readiness through consistent standards, independent evaluation, and education that better aligns community preparedness with corporate site selection requirements.' ),
				array( 'name' => 'about_mission_eyebrow', 'path' => 'mission.eyebrow', 'type' => 'text', 'label' => 'Mission / Eyebrow', 'default' => 'About REDI Sites' ),
				array( 'name' => 'about_mission_heading', 'path' => 'mission.heading', 'type' => 'text', 'label' => 'Mission / Heading', 'default' => 'Bringing Greater Confidence to Site Selection' ),
				array( 'name' => 'about_mission_paragraphs', 'path' => 'mission.paragraphs', 'type' => 'list', 'label' => 'Mission / Paragraphs', 'default' => 'Every community wants to demonstrate that its sites are "ready" for investment. But across the United States, there is no universal definition of what "site ready" actually means.

REDI Sites was created to establish a more consistent, transparent, and investment-focused standard for evaluating industrial properties. Rather than serving as another marketing designation, REDI Sites provides an objective framework that helps communities better prepare sites while giving companies greater confidence in the locations they evaluate.

Each designation combines engineering analysis with independent review by experienced site selection consultants, ensuring sites are evaluated through both technical and real-world corporate investment perspectives. The result is a more disciplined evaluation process that helps reduce uncertainty, identify potential risks earlier, and accelerate investment decisions.

Developed as an initiative of the Site Selectors Guild, REDI Sites reflects decades of experience advising corporations on major location decisions and translating those lessons into practical standards that benefit both communities and investors.' ),
				array( 'name' => 'about_businessmodel_eyebrow', 'path' => 'businessModel.eyebrow', 'type' => 'text', 'label' => 'Business Model / Eyebrow', 'default' => 'The Site Selectors Guild' ),
				array( 'name' => 'about_businessmodel_heading', 'path' => 'businessModel.heading', 'type' => 'text', 'label' => 'Business Model / Heading', 'default' => 'The Experts Behind REDI Sites' ),
				array( 'name' => 'about_businessmodel_paragraphs', 'path' => 'businessModel.paragraphs', 'type' => 'list', 'label' => 'Business Model / Paragraphs', 'default' => 'REDI Sites was developed by the Site Selectors Guild, the world\'s foremost association of professional site selection consultants.

Guild Members are independent advisors who help companies identify, evaluate, and select locations for major business investments around the world. Every Guild Member has earned the Certified Site Selection Consultant (CSSC) credential and is bound by a Code of Ethics emphasizing objectivity, confidentiality, and professional judgment.

Unlike organizations that promote communities, Guild Members represent the interests of corporate investors. Their collective experience evaluating hundreds of projects each year ensures REDI Sites reflects how companies actually assess investment readiness, not simply how sites are marketed.' ),
				array( 'name' => 'about_guildmission_heading', 'path' => 'guildMission.heading', 'type' => 'text', 'label' => 'Guild Mission / Heading', 'default' => 'Site Selectors Guild Mission & Vision' ),
				array( 'name' => 'about_guildmission_mission', 'path' => 'guildMission.mission', 'type' => 'textarea', 'label' => 'Guild Mission / Mission', 'default' => 'To advance the practice of site selection while helping companies make smarter location decisions and supporting communities in creating environments where investment can succeed.' ),
				array( 'name' => 'about_guildmission_vision', 'path' => 'guildMission.vision', 'type' => 'textarea', 'label' => 'Guild Mission / Vision', 'default' => 'A world where communities and corporate investors share a common understanding of investment readiness, resulting in faster decisions, reduced risk, and stronger economic outcomes.' ),
				array( 'name' => 'about_guildmission_ctalabel', 'path' => 'guildMission.ctaLabel', 'type' => 'text', 'label' => 'Guild Mission / CTA Label', 'default' => 'Visit Site Selectors Guild' ),
				array( 'name' => 'about_whyguild_eyebrow', 'path' => 'whyGuild.eyebrow', 'type' => 'text', 'label' => 'Why Guild / Eyebrow', 'default' => 'Why REDI Sites Exists' ),
				array( 'name' => 'about_whyguild_heading', 'path' => 'whyGuild.heading', 'type' => 'text', 'label' => 'Why Guild / Heading', 'default' => 'Why the Site Selectors Guild Created REDI Sites' ),
				array( 'name' => 'about_whyguild_paragraphs', 'path' => 'whyGuild.paragraphs', 'type' => 'list', 'label' => 'Why Guild / Paragraphs', 'default' => 'Communities have invested heavily in preparing industrial sites for development, but over time, "site readiness" has come to mean different things to different organizations.

Some programs emphasize environmental due diligence. Others focus on utilities, transportation, permitting, or marketing. While each provides value, the lack of a common standard can create uncertainty for companies evaluating locations.

The Site Selectors Guild recognized this growing disconnect between corporate expectations and community definitions of readiness. REDI Sites was developed to establish a consistent, credible framework rooted in real-world corporate site selection experience. Rather than replacing existing site readiness efforts, REDI Sites complements them by introducing an independent, investment-oriented perspective based on the criteria companies and their advisors evaluate every day.

The result is greater confidence for investors, greater clarity for communities, and a more efficient site selection process for everyone involved.' ),
				array( 'name' => 'about_team_eyebrow', 'path' => 'team.eyebrow', 'type' => 'text', 'label' => 'Team / Eyebrow', 'default' => 'Who We Are' ),
				array( 'name' => 'about_team_heading', 'path' => 'team.heading', 'type' => 'text', 'label' => 'Team / Heading', 'default' => 'Our Team' ),
				array( 'name' => 'about_board_eyebrow', 'path' => 'board.eyebrow', 'type' => 'text', 'label' => 'Board / Eyebrow', 'default' => 'Who We Are' ),
				array( 'name' => 'about_board_heading', 'path' => 'board.heading', 'type' => 'text', 'label' => 'Board / Heading', 'default' => 'Our Board' ),
				array( 'name' => 'about_partners_eyebrow', 'path' => 'partners.eyebrow', 'type' => 'text', 'label' => 'Partners / Eyebrow', 'default' => 'Who We Are With' ),
				array( 'name' => 'about_partners_heading', 'path' => 'partners.heading', 'type' => 'text', 'label' => 'Partners / Heading', 'default' => 'Our Partners' ),
			),
		),
		'approach' => array(
			'label'  => 'Approach',
			'slug'   => 'redi-approach',
			'fields' => array(
				array( 'name' => 'approach_hero_kicker', 'path' => 'hero.kicker', 'type' => 'text', 'label' => 'Hero / Kicker', 'default' => '' ),
				array( 'name' => 'approach_hero_heading', 'path' => 'hero.heading', 'type' => 'text', 'label' => 'Hero / Heading', 'default' => 'The Standard' ),
				array( 'name' => 'approach_hero_body', 'path' => 'hero.body', 'type' => 'textarea', 'label' => 'Hero / Body', 'default' => 'A site is rarely eliminated for being a bad site. It is eliminated when the information a site selector needs is missing, unclear, or unverified. Here is how REDI Sites evaluates that and what your site needs to participate. REDI Sites is industry- and use-agnostic. The evaluation focuses on the foundational factors that influence whether a site can advance with greater speed, certainty, and fewer surprises, regardless of the project ultimately considering it.' ),
				array( 'name' => 'approach_methodology_eyebrow', 'path' => 'methodology.eyebrow', 'type' => 'text', 'label' => 'Methodology / Eyebrow', 'default' => 'How It Works' ),
				array( 'name' => 'approach_methodology_heading', 'path' => 'methodology.heading', 'type' => 'text', 'label' => 'Methodology / Heading', 'default' => 'Every Site, Reviewed Twice' ),
				array( 'name' => 'approach_methodology_paragraphs', 'path' => 'methodology.paragraphs', 'type' => 'list', 'label' => 'Methodology / Paragraphs', 'default' => 'Your documentation is reviewed first by Terracon, an independent engineering firm, and then by REDI Reviewers, practicing site selectors who confirm the final score and designation.

There is no pass or fail. Every site that completes the process receives a designation on a 10-point readiness index, along with a report showing where it is strong and where gaps remain.' ),
				array( 'name' => 'approach_methodology_benefitslabel', 'path' => 'methodology.benefitsLabel', 'type' => 'text', 'label' => 'Methodology / Benefits Label', 'default' => 'Who Benefits?' ),
				array( 'name' => 'approach_methodology_benefits_0_label', 'path' => 'methodology.benefits[0].label', 'type' => 'text', 'label' => 'Methodology / Benefits 1 / Label', 'default' => 'Economic development organizations' ),
				array( 'name' => 'approach_methodology_benefits_0_description', 'path' => 'methodology.benefits[0].description', 'type' => 'text', 'label' => 'Methodology / Benefits 1 / Description', 'default' => 'a credible, third-party way to show site readiness to prospects, boards, and funders.' ),
				array( 'name' => 'approach_methodology_benefits_1_label', 'path' => 'methodology.benefits[1].label', 'type' => 'text', 'label' => 'Methodology / Benefits 2 / Label', 'default' => 'Landowners and developers' ),
				array( 'name' => 'approach_methodology_benefits_1_description', 'path' => 'methodology.benefits[1].description', 'type' => 'text', 'label' => 'Methodology / Benefits 2 / Description', 'default' => 'a stronger position with buyers, and a clear list of what adds value.' ),
				array( 'name' => 'approach_methodology_benefits_2_label', 'path' => 'methodology.benefits[2].label', 'type' => 'text', 'label' => 'Methodology / Benefits 3 / Label', 'default' => 'Utilities and railroads' ),
				array( 'name' => 'approach_methodology_benefits_2_description', 'path' => 'methodology.benefits[2].description', 'type' => 'text', 'label' => 'Methodology / Benefits 3 / Description', 'default' => 'a consistent way to evaluate and promote sites across a service territory or network.' ),
				array( 'name' => 'approach_methodology_benefits_3_label', 'path' => 'methodology.benefits[3].label', 'type' => 'text', 'label' => 'Methodology / Benefits 4 / Label', 'default' => 'States and regions' ),
				array( 'name' => 'approach_methodology_benefits_3_description', 'path' => 'methodology.benefits[3].description', 'type' => 'text', 'label' => 'Methodology / Benefits 4 / Description', 'default' => 'a portfolio-level view of site inventory and where to direct readiness investment.' ),
				array( 'name' => 'approach_process_eyebrow', 'path' => 'process.eyebrow', 'type' => 'text', 'label' => 'Process / Eyebrow', 'default' => 'Getting Designated' ),
				array( 'name' => 'approach_process_heading', 'path' => 'process.heading', 'type' => 'text', 'label' => 'Process / Heading', 'default' => 'The Designation Process' ),
				array( 'name' => 'approach_process_steps_0_label', 'path' => 'process.steps[0].label', 'type' => 'text', 'label' => 'Process / Steps 1 / Label', 'default' => 'Register' ),
				array( 'name' => 'approach_process_steps_0_description', 'path' => 'process.steps[0].description', 'type' => 'textarea', 'label' => 'Process / Steps 1 / Description', 'default' => 'Once registered, applicants submit documentation across five weighted categories of readiness through Lasso, an online property data collection database.' ),
				array( 'name' => 'approach_process_steps_1_label', 'path' => 'process.steps[1].label', 'type' => 'text', 'label' => 'Process / Steps 2 / Label', 'default' => 'Submit your RFI and documentation' ),
				array( 'name' => 'approach_process_steps_1_description', 'path' => 'process.steps[1].description', 'type' => 'text', 'label' => 'Process / Steps 2 / Description', 'default' => 'Answer the RFI and upload exhibits covering the scored categories.' ),
				array( 'name' => 'approach_process_steps_2_label', 'path' => 'process.steps[2].label', 'type' => 'text', 'label' => 'Process / Steps 3 / Label', 'default' => 'Engineering Review' ),
				array( 'name' => 'approach_process_steps_2_description', 'path' => 'process.steps[2].description', 'type' => 'text', 'label' => 'Process / Steps 3 / Description', 'default' => 'Your documentation goes to Terracon, the program\'s independent third-party engineering reviewer.' ),
				array( 'name' => 'approach_process_steps_3_label', 'path' => 'process.steps[3].label', 'type' => 'text', 'label' => 'Process / Steps 4 / Label', 'default' => 'REDI Review' ),
				array( 'name' => 'approach_process_steps_3_description', 'path' => 'process.steps[3].description', 'type' => 'textarea', 'label' => 'Process / Steps 4 / Description', 'default' => 'REDI Reviewers, practicing Site Selectors Guild members, review the Terracon report and have final decision authority on the site\'s score and designation level.' ),
				array( 'name' => 'approach_process_steps_4_label', 'path' => 'process.steps[4].label', 'type' => 'text', 'label' => 'Process / Steps 5 / Label', 'default' => 'Designation' ),
				array( 'name' => 'approach_process_steps_4_description', 'path' => 'process.steps[4].description', 'type' => 'textarea', 'label' => 'Process / Steps 5 / Description', 'default' => 'The site receives a feedback report, marketing materials and a listing in the REDI Sites database. Sites may use the REDI Sites logo and the logo for their designation level.' ),
				array( 'name' => 'approach_process_footnote', 'path' => 'process.footnote', 'type' => 'textarea', 'label' => 'Process / Footnote', 'default' => 'Designations are valid for one year. As additional due diligence is completed, a site can be resubmitted and redesignated at a higher level.' ),
				array( 'name' => 'approach_criteria_eyebrow', 'path' => 'criteria.eyebrow', 'type' => 'text', 'label' => 'Criteria / Eyebrow', 'default' => 'What Is Evaluated' ),
				array( 'name' => 'approach_criteria_heading', 'path' => 'criteria.heading', 'type' => 'text', 'label' => 'Criteria / Heading', 'default' => 'How Sites Are Scored' ),
				array( 'name' => 'approach_criteria_body', 'path' => 'criteria.body', 'type' => 'textarea', 'label' => 'Criteria / Body', 'default' => 'Each site receives a score from 0 to 10 based on the documentation submitted across five weighted sections. Within each section, individual categories carry their own weights. The section weights reflect what matters most to companies and the site selectors who advise them.' ),
				array( 'name' => 'approach_criteria_primarylabel', 'path' => 'criteria.primaryLabel', 'type' => 'text', 'label' => 'Criteria / Primary Label', 'default' => 'Primary site review criteria:' ),
				array( 'name' => 'approach_criteria_eligiblelabel', 'path' => 'criteria.eligibleLabel', 'type' => 'text', 'label' => 'Criteria / Eligible Label', 'default' => 'Does your site meet the minimum requirements?' ),
				array( 'name' => 'approach_criteria_downloadlabel', 'path' => 'criteria.downloadLabel', 'type' => 'text', 'label' => 'Criteria / Download Label', 'default' => 'Download Scoring Scale' ),
				array( 'name' => 'approach_criteria_downloadformheading', 'path' => 'criteria.downloadFormHeading', 'type' => 'text', 'label' => 'Criteria / Download Form Heading', 'default' => 'Get the Full Scoring Scale' ),
				array( 'name' => 'approach_criteria_downloadformbody', 'path' => 'criteria.downloadFormBody', 'type' => 'text', 'label' => 'Criteria / Download Form Body', 'default' => 'The complete REDI Sites scoring scale, showing every category and how points are awarded.' ),
				array( 'name' => 'approach_criteria_charttitle', 'path' => 'criteria.chartTitle', 'type' => 'text', 'label' => 'Criteria / Chart Title', 'default' => 'Scoring Weights' ),
				array( 'name' => 'approach_criteria_documentslabel', 'path' => 'criteria.documentsLabel', 'type' => 'text', 'label' => 'Criteria / Documents Label', 'default' => 'Do You Have the Core Documents?' ),
				array( 'name' => 'approach_criteria_documentsintro', 'path' => 'criteria.documentsIntro', 'type' => 'text', 'label' => 'Criteria / Documents Intro', 'default' => 'These are the documents that most often make the biggest difference in a site\'s designation.' ),
				array( 'name' => 'approach_criteria_documentsfootnote', 'path' => 'criteria.documentsFootnote', 'type' => 'textarea', 'label' => 'Criteria / Documents Footnote', 'default' => 'Missing a few items? That is normal. Categories without documentation can be skipped, and you can level up later through redesignation.' ),
			),
		),
		'contact' => array(
			'label'  => 'Contact',
			'slug'   => 'redi-contact',
			'fields' => array(
				array( 'name' => 'contact_hero_kicker', 'path' => 'hero.kicker', 'type' => 'text', 'label' => 'Hero / Kicker', 'default' => 'Get In Touch' ),
				array( 'name' => 'contact_hero_heading', 'path' => 'hero.heading', 'type' => 'text', 'label' => 'Hero / Heading', 'default' => 'Contact' ),
				array( 'name' => 'contact_form_heading', 'path' => 'form.heading', 'type' => 'text', 'label' => 'Form / Heading', 'default' => 'Send us a message' ),
			),
		),
		'sites' => array(
			'label'  => 'Sites',
			'slug'   => 'redi-sites',
			'fields' => array(
				array( 'name' => 'sites_hero_kicker', 'path' => 'hero.kicker', 'type' => 'text', 'label' => 'Hero / Kicker', 'default' => 'View Properties' ),
				array( 'name' => 'sites_hero_heading', 'path' => 'hero.heading', 'type' => 'text', 'label' => 'Hero / Heading', 'default' => 'Sites' ),
				array( 'name' => 'sites_guidancecta_heading', 'path' => 'guidanceCta.heading', 'type' => 'text', 'label' => 'Guidance CTA / Heading', 'default' => 'Want expert guidance on whether this site fits your project?' ),
				array( 'name' => 'sites_guidancecta_body', 'path' => 'guidanceCta.body', 'type' => 'text', 'label' => 'Guidance CTA / Body', 'default' => 'Site Selectors Guild members are the world\'s foremost site selection consultants - and they know this database well.' ),
				array( 'name' => 'sites_guidancecta_ctalabel', 'path' => 'guidanceCta.ctaLabel', 'type' => 'text', 'label' => 'Guidance CTA / CTA Label', 'default' => 'Find A Site Selector | Site Selectors Guild' ),
			),
		),
		'updates' => array(
			'label'  => 'Updates',
			'slug'   => 'redi-updates',
			'fields' => array(
				array( 'name' => 'updates_hero_kicker', 'path' => 'hero.kicker', 'type' => 'text', 'label' => 'Hero / Kicker', 'default' => 'Posts & News' ),
				array( 'name' => 'updates_hero_heading', 'path' => 'hero.heading', 'type' => 'text', 'label' => 'Hero / Heading', 'default' => 'Latest Updates' ),
				array( 'name' => 'updates_filters_filterlabel', 'path' => 'filters.filterLabel', 'type' => 'text', 'label' => 'Filters / Filter Label', 'default' => 'Filter' ),
				array( 'name' => 'updates_filters_sortlabel', 'path' => 'filters.sortLabel', 'type' => 'text', 'label' => 'Filters / Sort Label', 'default' => 'Sort By: Most Recent First' ),
				array( 'name' => 'updates_filters_searchplaceholder', 'path' => 'filters.searchPlaceholder', 'type' => 'text', 'label' => 'Filters / Search Placeholder', 'default' => 'Search Updates...' ),
				array( 'name' => 'updates_sectionheading', 'path' => 'sectionHeading', 'type' => 'text', 'label' => 'Section Heading', 'default' => 'Newsfeed' ),
			),
		),
		'legal' => array(
			'label'  => 'Legal',
			'slug'   => 'redi-legal',
			'fields' => array(
				array( 'name' => 'legal_hero_kicker', 'path' => 'hero.kicker', 'type' => 'text', 'label' => 'Hero / Kicker', 'default' => 'Legalities' ),
				array( 'name' => 'legal_hero_heading', 'path' => 'hero.heading', 'type' => 'text', 'label' => 'Hero / Heading', 'default' => 'Terms & Conditions' ),
			),
		),
	);
}

const REDI_PAGES_OPTION         = 'redi_page_editor_ids';
const REDI_PAGES_VERSION_OPTION = 'redi_page_editor_version';
/**
 * Set by the generator to the plugin version plus a short hash of the field
 * list, so ANY change to the editable copy changes it. That is deliberate: the
 * in-place update check below keys off this value, and the case that must not
 * be missed is a regenerated plugin that adds a page. A hand-maintained
 * version number would be forgotten exactly then.
 */
const REDI_PAGES_VERSION        = '2.0.1+b6e19699';

/* -------------------------------------------------------------------------
 * 1. The pages
 * ---------------------------------------------------------------------- */

/**
 * Creates one page per site page and fills it with the copy that is live, so
 * an editor opens real text rather than empty boxes.
 *
 * Reuses a page that already carries the slug, which is what keeps the Home
 * page created by REDI Home Editor 1.x, along with anything already typed
 * into it.
 */
function redi_pages_activate() {
	$ids = (array) get_option( REDI_PAGES_OPTION, array() );

	foreach ( redi_pages_manifest() as $key => $page ) {
		$existing = get_page_by_path( $page['slug'], OBJECT, 'page' );

		if ( $existing ) {
			$ids[ $key ] = $existing->ID;
		} else {
			$id = wp_insert_post(
				array(
					'post_title'   => $page['label'] . ' Page (REDI)',
					'post_name'    => $page['slug'],
					'post_type'    => 'page',
					'post_status'  => 'publish',
					'post_content' => '',
				)
			);

			if ( is_wp_error( $id ) || ! $id ) {
				continue;
			}

			$ids[ $key ] = $id;
		}

		// Reused pages get their defaults too. Skipping this is what left the
		// Home screen showing 43 empty boxes on 2026-11-04: its page already
		// existed, carried over from REDI Home Editor, so it was recorded and
		// passed over. The site was never at risk - blank means "keep the
		// approved copy" - but an editor opening a wall of empty fields has no
		// idea that is what blank means.
		redi_pages_fill_defaults( $ids[ $key ], $page['fields'] );
	}

	update_option( REDI_PAGES_OPTION, $ids );
}
register_activation_hook( __FILE__, 'redi_pages_activate' );

/**
 * Re-runs the setup after the plugin is updated in place.
 *
 * Activation hooks do not fire when a plugin is replaced by uploading a newer
 * zip over an active one, which is exactly how this plugin gets updated: the
 * field list is regenerated from the site's copy, so new versions are routine.
 * Without this, a version that adds a page would register fields for a page
 * that was never created, and the editor would simply not see it.
 *
 * Guarded by a stored version, so it is one option read per admin request and
 * does nothing until the plugin version actually changes. Safe to repeat:
 * redi_pages_activate() reuses any page that already carries the slug and only
 * writes defaults into pages it creates, so nothing already typed is touched.
 */
add_action(
	'admin_init',
	function () {
		if ( get_option( REDI_PAGES_VERSION_OPTION ) === REDI_PAGES_VERSION ) {
			return;
		}
		redi_pages_activate();
		update_option( REDI_PAGES_VERSION_OPTION, REDI_PAGES_VERSION );
	}
);

/**
 * Writes the live copy into any field that has never been filled in.
 *
 * `metadata_exists` rather than an empty check, so the two meanings of "empty"
 * stay apart: a field nobody has touched gets the current copy, and a field an
 * editor deliberately cleared stays cleared. Both render identically - blank
 * keeps the approved copy either way - but repopulating a box someone emptied
 * on purpose would look like the CMS fighting back.
 *
 * Safe to call repeatedly, which is what lets the update check re-run it.
 */
function redi_pages_fill_defaults( $page_id, $fields ) {
	if ( ! function_exists( 'update_field' ) ) {
		return;
	}
	foreach ( $fields as $field ) {
		if ( metadata_exists( 'post', $page_id, $field['name'] ) ) {
			continue;
		}
		update_field( $field['name'], $field['default'], $page_id );
	}
}

/** Page id for a manifest key, or 0 before activation has run. */
function redi_pages_id( $key ) {
	$ids = (array) get_option( REDI_PAGES_OPTION, array() );
	if ( isset( $ids[ $key ] ) && get_post( $ids[ $key ] ) ) {
		return (int) $ids[ $key ];
	}
	$manifest = redi_pages_manifest();
	if ( ! isset( $manifest[ $key ] ) ) {
		return 0;
	}
	$page = get_page_by_path( $manifest[ $key ]['slug'], OBJECT, 'page' );
	return $page ? $page->ID : 0;
}

/* -------------------------------------------------------------------------
 * 2. The fields
 * ---------------------------------------------------------------------- */

add_action(
	'acf/init',
	function () {
		if ( ! function_exists( 'acf_add_local_field_group' ) ) {
			return; // ACF inactive - fail quiet rather than fatal.
		}

		foreach ( redi_pages_manifest() as $key => $page ) {
			$page_id = redi_pages_id( $key );
			if ( ! $page_id ) {
				continue;
			}

			$fields  = array();
			$section = null;

			foreach ( $page['fields'] as $field ) {
				// First segment of the label is the section it belongs to, so
				// a long page breaks into tabs instead of one endless column.
				$parts = explode( ' / ', $field['label'] );
				$group = $parts[0];

				if ( $group !== $section ) {
					$section  = $group;
					$fields[] = array(
						'key'   => 'field_' . $field['name'] . '_tab',
						'label' => $group,
						'type'  => 'tab',
					);
				}

				$is_list = 'list' === $field['type'];
				$fields[] = array(
					'key'          => 'field_' . $field['name'],
					'label'        => count( $parts ) > 1 ? implode( ' / ', array_slice( $parts, 1 ) ) : $field['label'],
					'name'         => $field['name'],
					'type'         => $is_list || 'textarea' === $field['type'] ? 'textarea' : 'text',
					'rows'         => $is_list ? 8 : 3,
					'new_lines'    => '',
					'instructions' => $is_list
						? 'One item per block, separated by a blank line. Leave empty to keep what is on the site now.'
						: 'Leave empty to keep what is on the site now.',
				);
			}

			acf_add_local_field_group(
				array(
					'key'          => 'group_redi_page_' . $key,
					'title'        => $page['label'] . ' Page Content',
					'menu_order'   => 0,
					'position'     => 'normal',
					'active'       => true,
					'show_in_rest' => 1,
					'location'     => array(
						array(
							array(
								'param'    => 'page',
								'operator' => '==',
								'value'    => $page_id,
							),
						),
					),
					'fields'       => $fields,
				)
			);
		}
	}
);

/** Hides the block editor on these pages: the fields are the content. */
add_filter(
	'use_block_editor_for_post',
	function ( $use, $post ) {
		if ( ! $post instanceof WP_Post ) {
			return $use;
		}
		foreach ( array_keys( redi_pages_manifest() ) as $key ) {
			if ( (int) $post->ID === redi_pages_id( $key ) ) {
				return false;
			}
		}
		return $use;
	},
	10,
	2
);

/* -------------------------------------------------------------------------
 * 3. The route the frontend reads
 * ---------------------------------------------------------------------- */

/** Writes a value into a nested array at a dotted path like a.b[0].c. */
function redi_pages_set_path( &$target, $path, $value ) {
	$segments = array();
	foreach ( explode( '.', $path ) as $part ) {
		if ( preg_match_all( '/^([^\[]+)|\[(\d+)\]/', $part, $matches, PREG_SET_ORDER ) ) {
			foreach ( $matches as $match ) {
				$segments[] = '' !== $match[1] ? $match[1] : (int) $match[2];
			}
		}
	}

	$cursor = &$target;
	$last   = array_pop( $segments );
	foreach ( $segments as $segment ) {
		if ( ! isset( $cursor[ $segment ] ) || ! is_array( $cursor[ $segment ] ) ) {
			$cursor[ $segment ] = array();
		}
		$cursor = &$cursor[ $segment ];
	}
	$cursor[ $last ] = $value;
}

/**
 * Own namespace, not redi/v1. That belongs to REDI Headless CMS, and sharing
 * it risks a collision the day it adds a route of its own.
 *
 * Only fields an editor has filled in appear. Anything absent means "no
 * change", which the frontend reads as "keep the approved copy".
 */
add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'ethixweb/v1',
			'/page-copy',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true', // public: the same copy the pages already show
				'callback'            => function () {
					$out = array();

					foreach ( redi_pages_manifest() as $key => $page ) {
						$page_id = redi_pages_id( $key );
						if ( ! $page_id || ! function_exists( 'get_field' ) ) {
							continue;
						}

						foreach ( $page['fields'] as $field ) {
							$value = get_field( $field['name'], $page_id );
							if ( ! is_string( $value ) ) {
								continue;
							}
							$value = trim( $value );
							if ( '' === $value ) {
								continue; // untouched: let the site keep its own copy
							}

							if ( 'list' === $field['type'] ) {
								$items = preg_split( '/\R\s*\R/', $value );
								$items = array_values( array_filter( array_map( 'trim', $items ), 'strlen' ) );
								if ( ! $items ) {
									continue;
								}
								redi_pages_set_path( $out, $key . '.' . $field['path'], $items );
							} else {
								redi_pages_set_path( $out, $key . '.' . $field['path'], $value );
							}
						}
					}

					return rest_ensure_response( $out );
				},
			)
		);
	}
);

/* -------------------------------------------------------------------------
 * 4. Rebuild the site when a page is saved
 * ---------------------------------------------------------------------- */

/**
 * REDI Auto Deploy watches the five content post types, not pages, so saving
 * one of these would otherwise change nothing until an unrelated publish.
 */
add_action(
	'acf/save_post',
	function ( $post_id ) {
		if ( ! is_numeric( $post_id ) || ! function_exists( 'redi_deploy_schedule' ) ) {
			return;
		}
		foreach ( array_keys( redi_pages_manifest() ) as $key ) {
			if ( (int) $post_id === redi_pages_id( $key ) ) {
				redi_deploy_schedule();
				return;
			}
		}
	},
	20
);
