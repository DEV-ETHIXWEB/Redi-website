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
			'title'  => 'Home Page (REDI)',
			'fields' => array(
				array( 'name' => 'home_hero_kicker', 'path' => 'hero.kicker', 'type' => 'text', 'label' => 'Hero / Kicker', 'default' => '' ),
				array( 'name' => 'home_hero_headline', 'path' => 'hero.headline', 'type' => 'text', 'label' => 'Hero / Headline', 'default' => 'The National Standard for Site Readiness' ),
				array( 'name' => 'home_hero_paragraphs', 'path' => 'hero.paragraphs', 'type' => 'list', 'label' => 'Hero / Paragraphs', 'default' => 'Companies making location decisions move fast and eliminate sites early. Most sites are not ruled out because they are bad sites. They are ruled out because key information is missing, unclear or unverified when a site selector needs it.

REDI Sites is the first national site readiness designation program in the United States, developed in affiliation with the Site Selectors Guild. Every site that completes the process receives a designation reflecting its current level of investment readiness, telling site selectors exactly where it stands, and telling you what to do next.' ),
				array( 'name' => 'home_hero_ctaprimary_label', 'path' => 'hero.ctaPrimary.label', 'type' => 'text', 'label' => 'Hero / CTA Primary / Label', 'default' => 'Explore Sites' ),
				array( 'name' => 'home_hero_ctasecondary_label', 'path' => 'hero.ctaSecondary.label', 'type' => 'text', 'label' => 'Hero / CTA Secondary / Label', 'default' => 'Register Your Site' ),
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
				array( 'name' => 'home_valuecompare_ready_items', 'path' => 'valueCompare.ready.items', 'type' => 'blocklist', 'label' => 'Value Compare / Ready / Items', 'default' => 'Utilities
Confirmed capacity with a path to the site

Environmental
Record independently reviewed and cleared

Ownership & Entitlements
Title is clean, authority to sell is documented

Ease of Development
Ground studied, floodplain mapped, site cleared

Logistics
Highway access and ingress/egress documented', 'fields' => array( 'label', 'description' ) ),
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
			'title'  => 'About Page (REDI)',
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
			'title'  => 'Approach Page (REDI)',
			'fields' => array(
				array( 'name' => 'approach_hero_kicker', 'path' => 'hero.kicker', 'type' => 'text', 'label' => 'Hero / Kicker', 'default' => '' ),
				array( 'name' => 'approach_hero_heading', 'path' => 'hero.heading', 'type' => 'text', 'label' => 'Hero / Heading', 'default' => 'The Standard' ),
				array( 'name' => 'approach_hero_body', 'path' => 'hero.body', 'type' => 'textarea', 'label' => 'Hero / Body', 'default' => 'A site is rarely eliminated for being a bad site. It is eliminated when the information a site selector needs is missing, unclear, or unverified. Here is how REDI Sites evaluates that and what your site needs to participate. REDI Sites is industry- and use-agnostic. The evaluation focuses on the foundational factors that influence whether a site can advance with greater speed, certainty, and fewer surprises, regardless of the project ultimately considering it.' ),
				array( 'name' => 'approach_methodology_eyebrow', 'path' => 'methodology.eyebrow', 'type' => 'text', 'label' => 'Methodology / Eyebrow', 'default' => 'How It Works' ),
				array( 'name' => 'approach_methodology_heading', 'path' => 'methodology.heading', 'type' => 'text', 'label' => 'Methodology / Heading', 'default' => 'Every Site, Reviewed Twice' ),
				array( 'name' => 'approach_methodology_paragraphs', 'path' => 'methodology.paragraphs', 'type' => 'list', 'label' => 'Methodology / Paragraphs', 'default' => 'Your documentation is reviewed first by Terracon, an independent engineering firm, and then by REDI Reviewers, practicing site selectors who confirm the final score and designation.

There is no pass or fail. Every site that completes the process receives a designation on a 10-point readiness index, along with a report showing where it is strong and where gaps remain.' ),
				array( 'name' => 'approach_methodology_benefitslabel', 'path' => 'methodology.benefitsLabel', 'type' => 'text', 'label' => 'Methodology / Benefits Label', 'default' => 'Who Benefits?' ),
				array( 'name' => 'approach_methodology_benefits', 'path' => 'methodology.benefits', 'type' => 'blocklist', 'label' => 'Methodology / Benefits', 'default' => 'Economic development organizations
a credible, third-party way to show site readiness to prospects, boards, and funders.

Landowners and developers
a stronger position with buyers, and a clear list of what adds value.

Utilities and railroads
a consistent way to evaluate and promote sites across a service territory or network.

States and regions
a portfolio-level view of site inventory and where to direct readiness investment.', 'fields' => array( 'label', 'description' ) ),
				array( 'name' => 'approach_process_eyebrow', 'path' => 'process.eyebrow', 'type' => 'text', 'label' => 'Process / Eyebrow', 'default' => 'Getting Designated' ),
				array( 'name' => 'approach_process_heading', 'path' => 'process.heading', 'type' => 'text', 'label' => 'Process / Heading', 'default' => 'The Designation Process' ),
				array( 'name' => 'approach_process_steps', 'path' => 'process.steps', 'type' => 'blocklist', 'label' => 'Process / Steps', 'default' => 'Register
Once registered, applicants submit documentation across five weighted categories of readiness through Lasso, an online property data collection database.

Submit your RFI and documentation
Answer the RFI and upload exhibits covering the scored categories.

Engineering Review
Your documentation goes to Terracon, the program\'s independent third-party engineering reviewer.

REDI Review
REDI Reviewers, practicing Site Selectors Guild members, review the Terracon report and have final decision authority on the site\'s score and designation level.

Designation
The site receives a feedback report, marketing materials and a listing in the REDI Sites database. Sites may use the REDI Sites logo and the logo for their designation level.', 'fields' => array( 'label', 'description' ) ),
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
			'title'  => 'Contact Page (REDI)',
			'fields' => array(
				array( 'name' => 'contact_hero_kicker', 'path' => 'hero.kicker', 'type' => 'text', 'label' => 'Hero / Kicker', 'default' => 'Get In Touch' ),
				array( 'name' => 'contact_hero_heading', 'path' => 'hero.heading', 'type' => 'text', 'label' => 'Hero / Heading', 'default' => 'Contact' ),
				array( 'name' => 'contact_form_heading', 'path' => 'form.heading', 'type' => 'text', 'label' => 'Form / Heading', 'default' => 'Send us a message' ),
			),
		),
		'sites' => array(
			'label'  => 'Sites',
			'slug'   => 'redi-sites',
			'title'  => 'Sites Page (REDI)',
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
			'title'  => 'Updates Page (REDI)',
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
			'title'  => 'Legal Page (REDI)',
			'fields' => array(
				array( 'name' => 'legal_hero_kicker', 'path' => 'hero.kicker', 'type' => 'text', 'label' => 'Hero / Kicker', 'default' => 'Legalities' ),
				array( 'name' => 'legal_hero_heading', 'path' => 'hero.heading', 'type' => 'text', 'label' => 'Hero / Heading', 'default' => 'Terms & Conditions' ),
			),
		),
		'advantages' => array(
			'label'  => 'Why Choose Cards',
			'slug'   => 'redi-advantages',
			'title'  => 'Why Choose Cards (REDI)',
			'fields' => array(
				array( 'name' => 'advantages', 'path' => '', 'type' => 'blocklist', 'label' => 'Advantages', 'default' => 'Seen by Site Selectors
Your site and its full supporting documentation sit in the REDI Sites database, where Guild members and their teams evaluate locations.

Found by Everyone Else
The public viewer shows your site\'s basics and designation level to companies, developers, and brokers. Full documentation stays with Guild members.

Independent Validation
The standard was built by site selectors and is reviewed annually. Terracon reviews your documentation, then practicing site selectors confirm the score. This is not a self-reported checklist.

One National Standard
The same criteria in every state, so a Gold site in one market means what a Gold site means in another.

A Clear Roadmap
Every site gets a feedback report showing where it\'s strong and where gaps remain. That report is a practical plan for your next investment.

Marketing You Can Use
Designated sites receive marketing materials and the right to display the REDI Sites logo and their designation-level logo.

Ready When a Project Calls
Assemble your exhibits once, in a standard format, and answer fast when a prospect asks.', 'fields' => array( 'title', 'description' ) ),
			),
		),
		'legalSections' => array(
			'label'  => 'Legal Sections',
			'slug'   => 'redi-legal-sections',
			'title'  => 'Legal Sections (REDI)',
			'fields' => array(
				array( 'name' => 'legalsections_0_eyebrow', 'path' => '[0].eyebrow', 'type' => 'text', 'label' => '1 / Eyebrow', 'default' => 'Sitewide' ),
				array( 'name' => 'legalsections_0_heading', 'path' => '[0].heading', 'type' => 'text', 'label' => '1 / Heading', 'default' => 'Terms of Use' ),
				array( 'name' => 'legalsections_0_bodyhtml', 'path' => '[0].bodyHtml', 'type' => 'textarea', 'label' => '1 / Body Html', 'default' => '<p>Welcome to REDI Sites. By accessing our website, you agree to comply with and be bound by the following terms and conditions. All content provided is for informational purposes only and does not constitute professional advice. We reserve the right to modify or discontinue any part of the site without prior notice. Users agree not to misuse the site or interfere with its operation. REDI Sites is not liable for any damages arising from the use of our services or information. All intellectual property on this site is owned by REDI Sites and may not be used without permission. By using this site, you consent to these terms and our privacy policy.</p>' ),
				array( 'name' => 'legalsections_1_eyebrow', 'path' => '[1].eyebrow', 'type' => 'text', 'label' => '2 / Eyebrow', 'default' => 'Sitewide' ),
				array( 'name' => 'legalsections_1_heading', 'path' => '[1].heading', 'type' => 'text', 'label' => '2 / Heading', 'default' => 'Privacy Policy' ),
				array( 'name' => 'legalsections_1_bodyhtml', 'path' => '[1].bodyHtml', 'type' => 'textarea', 'label' => '2 / Body Html', 'default' => '<p>At REDI Sites, we prioritize your privacy and are committed to protecting your personal information. This privacy policy explains how we collect, use, and safeguard your data when you use our services.</p><p>We collect information you provide directly, such as contact details and project requirements, to deliver tailored evaluations and support. We also gather data automatically through website interactions to improve user experience.</p><p>Your information is used solely to enhance our services, communicate updates, and comply with legal obligations. We do not share your personal data with third parties without your consent, except as required by law.</p><p>We implement robust security measures to protect your information from unauthorized access or disclosure. You have the right to access, correct, or request deletion of your data at any time.</p><p>By using REDI Sites, you agree to this privacy policy. We may update it periodically, and we encourage you to review it regularly to stay informed about how we protect your privacy.</p>' ),
				array( 'name' => 'legalsections_2_eyebrow', 'path' => '[2].eyebrow', 'type' => 'text', 'label' => '3 / Eyebrow', 'default' => 'Scoring' ),
				array( 'name' => 'legalsections_2_heading', 'path' => '[2].heading', 'type' => 'text', 'label' => '3 / Heading', 'default' => 'Terms of Use' ),
				array( 'name' => 'legalsections_2_bodyhtml', 'path' => '[2].bodyHtml', 'type' => 'textarea', 'label' => '3 / Body Html', 'default' => '<p>By using REDI Sites™ and STRATA Platforms® assets, users agree to represent these brands with complete accuracy and honesty at all times. All scoring, evaluations, and data provided through these platforms must be truthful, precise, and free from any form of misrepresentation or exaggeration. Users are expected to utilize company assets responsibly, strictly adhering to their intended purposes while fully respecting all intellectual property rights associated with these brands. Any unauthorized use, modification, or alteration of materials is strictly prohibited and may result in legal consequences. Furthermore, users acknowledge that by complying with these terms, they contribute to preserving the integrity, reliability, and trustworthiness of REDI Sites™ and STRATA Platforms® services, ensuring a fair and transparent experience for all stakeholders involved.</p>' ),
				array( 'name' => 'legalsections_3_eyebrow', 'path' => '[3].eyebrow', 'type' => 'text', 'label' => '4 / Eyebrow', 'default' => 'Scoring' ),
				array( 'name' => 'legalsections_3_heading', 'path' => '[3].heading', 'type' => 'text', 'label' => '4 / Heading', 'default' => 'Branding Guidelines' ),
				array( 'name' => 'legalsections_3_bodyhtml', 'path' => '[3].bodyHtml', 'type' => 'textarea', 'label' => '4 / Body Html', 'default' => '<p>All files downloaded and provided by REDI Sites™ are intended solely for non-commercial use by external entities and parties. These files, including scoring logos, are proprietary and must not be commercially distributed, replicated, or used by any organizations other than REDI Sites and Strata Platforms.</p><p>The scoring logos themselves are carefully designed visual representations that accurately reflect the score assigned to a commercial property based on its current condition. These logos are generated through rigorous methodologies developed by REDI Sites and Strata Platforms, ensuring that each score is a reliable indicator of property status. The logos serve as a standardized symbol to communicate property evaluations clearly and consistently across various platforms and reports. Usage of these logos is strictly limited to accurately depicting the assigned score without alteration, and must always adhere to the guidelines and terms set forth by REDI Sites and Strata Platforms.</p><p>Additionally, all other files provided - such as data sets, reports, and analytical tools - are protected under the same non-commercial use policy. No entity other than REDI Sites or Strata Platforms is authorized to distribute, replicate, or utilize these files for commercial purposes. This restriction ensures the integrity and exclusivity of the proprietary information and methodologies contained within these materials. Compliance with the Terms of Use outlined above is mandatory for all users, and any unauthorized commercial use or distribution may result in legal action.</p>' ),
			),
		),
		'scoreTiers' => array(
			'label'  => 'REDI Score Tiers',
			'slug'   => 'redi-score-tiers',
			'title'  => 'REDI Score Tiers (REDI)',
			'fields' => array(
				array( 'name' => 'scoretiers_0_label', 'path' => '[0].label', 'type' => 'text', 'label' => '1 / Label', 'default' => 'Emerging' ),
				array( 'name' => 'scoretiers_0_range', 'path' => '[0].range', 'type' => 'text', 'label' => '1 / Range', 'default' => 'Below 6.0' ),
				array( 'name' => 'scoretiers_0_description', 'path' => '[0].description', 'type' => 'textarea', 'label' => '1 / Description', 'default' => 'These sites are in the early stages of readiness. Some foundational due diligence may be complete, but additional documentation and development steps are needed.' ),
				array( 'name' => 'scoretiers_1_label', 'path' => '[1].label', 'type' => 'text', 'label' => '2 / Label', 'default' => 'Bronze' ),
				array( 'name' => 'scoretiers_1_range', 'path' => '[1].range', 'type' => 'text', 'label' => '2 / Range', 'default' => '6.0 - 6.9' ),
				array( 'name' => 'scoretiers_1_description', 'path' => '[1].description', 'type' => 'textarea', 'label' => '2 / Description', 'default' => 'Sites at this level meet basic readiness standards. Core infrastructure and documentation are in place, but there may still be a few key areas requiring additional work or clarification.' ),
				array( 'name' => 'scoretiers_2_label', 'path' => '[2].label', 'type' => 'text', 'label' => '3 / Label', 'default' => 'Silver' ),
				array( 'name' => 'scoretiers_2_range', 'path' => '[2].range', 'type' => 'text', 'label' => '3 / Range', 'default' => '7.0 - 7.9' ),
				array( 'name' => 'scoretiers_2_description', 'path' => '[2].description', 'type' => 'textarea', 'label' => '3 / Description', 'default' => 'Sites at this level demonstrate a strong overall readiness profile, with many key elements of due diligence in place. There may still be a few areas where additional work could improve the site\'s competitiveness.' ),
				array( 'name' => 'scoretiers_3_label', 'path' => '[3].label', 'type' => 'text', 'label' => '4 / Label', 'default' => 'Gold' ),
				array( 'name' => 'scoretiers_3_range', 'path' => '[3].range', 'type' => 'text', 'label' => '4 / Range', 'default' => '8.0 - 8.9' ),
				array( 'name' => 'scoretiers_3_description', 'path' => '[3].description', 'type' => 'textarea', 'label' => '4 / Description', 'default' => 'Gold sites reflect a high level of preparedness, with nearly all due diligence completed and minimal (if any) barriers to immediate development.' ),
				array( 'name' => 'scoretiers_4_label', 'path' => '[4].label', 'type' => 'text', 'label' => '5 / Label', 'default' => 'Platinum' ),
				array( 'name' => 'scoretiers_4_range', 'path' => '[4].range', 'type' => 'text', 'label' => '5 / Range', 'default' => '9.0 - 10.0' ),
				array( 'name' => 'scoretiers_4_description', 'path' => '[4].description', 'type' => 'textarea', 'label' => '5 / Description', 'default' => 'These are exceptional sites with comprehensive due diligence, excellent infrastructure access, and a high degree of development readiness. Platinum designations are rare and reflect the highest tier of readiness in the program.' ),
			),
		),
		'coreDocuments' => array(
			'label'  => 'Core Documents',
			'slug'   => 'redi-core-documents',
			'title'  => 'Core Documents (REDI)',
			'fields' => array(
				array( 'name' => 'coredocuments', 'path' => '', 'type' => 'blocklist', 'label' => 'Core Documents', 'default' => 'Ownership & Entitlements
Deed showing current owner, plus a listing/option agreement or owner letter confirming the site is for sale or lease; stated price or terms

Survey
ALTA or boundary survey, or at minimum a legal description

Zoning
Current zoning and land use map, and how the intended use fits

Utility Will-Serve Letters
Water, wastewater, electric, natural gas, and fiber: provider, distance, capacity, who pays, and timeline to serve

Phase I ESA
Ideally less than 5 years old

Wetlands
Wetland delineation report and, if wetlands are present, a USACE Jurisdictional Determination

Floodplain
FEMA FIRM panel map with the site clearly outlined

Geotechnical
Geotechnical report or desktop subsurface study

Cultural Resources & T&E Species
SHPO clearance letter and a threatened and endangered species assessment

Access
Map showing the site, route to the nearest interstate interchange, and ingress/egress points', 'fields' => array( 'area', 'submit' ) ),
			),
		),
		'scoringCriteria' => array(
			'label'  => 'Scoring Criteria',
			'slug'   => 'redi-scoring-criteria',
			'title'  => 'Scoring Criteria (REDI)',
			'fields' => array(
				array( 'name' => 'scoringcriteria_weights_0_label', 'path' => 'weights[0].label', 'type' => 'text', 'label' => 'Weights 1 / Label', 'default' => 'Utilities' ),
				array( 'name' => 'scoringcriteria_weights_1_label', 'path' => 'weights[1].label', 'type' => 'text', 'label' => 'Weights 2 / Label', 'default' => 'Ownership & Entitlements' ),
				array( 'name' => 'scoringcriteria_weights_2_label', 'path' => 'weights[2].label', 'type' => 'text', 'label' => 'Weights 3 / Label', 'default' => 'Environmental' ),
				array( 'name' => 'scoringcriteria_weights_3_label', 'path' => 'weights[3].label', 'type' => 'text', 'label' => 'Weights 4 / Label', 'default' => 'Ease of Development' ),
				array( 'name' => 'scoringcriteria_weights_4_label', 'path' => 'weights[4].label', 'type' => 'text', 'label' => 'Weights 5 / Label', 'default' => 'Logistics' ),
				array( 'name' => 'scoringcriteria_primarycriteria', 'path' => 'primaryCriteria', 'type' => 'list', 'label' => 'Primary Criteria', 'default' => 'Ownership and Entitlements

Utilities

Ease of Development

Environmental

Logistics' ),
				array( 'name' => 'scoringcriteria_eligibility', 'path' => 'eligibility', 'type' => 'list', 'label' => 'Eligibility', 'default' => 'Located in the US

At least 5 acres

Available for sale or lease' ),
			),
		),
		'siteSettings' => array(
			'label'  => 'Site Settings',
			'slug'   => 'redi-site-settings',
			'title'  => 'Site Settings (REDI)',
			'fields' => array(
				array( 'name' => 'sitesettings_sitename', 'path' => 'siteName', 'type' => 'text', 'label' => 'Site Name', 'default' => 'REDI Sites' ),
				array( 'name' => 'sitesettings_tagline', 'path' => 'tagline', 'type' => 'text', 'label' => 'Tagline', 'default' => 'Readiness Evaluation for Development and Investment' ),
				array( 'name' => 'sitesettings_primarynav_0_label', 'path' => 'primaryNav[0].label', 'type' => 'text', 'label' => 'Primary Nav 1 / Label', 'default' => 'Home' ),
				array( 'name' => 'sitesettings_primarynav_1_label', 'path' => 'primaryNav[1].label', 'type' => 'text', 'label' => 'Primary Nav 2 / Label', 'default' => 'About Us' ),
				array( 'name' => 'sitesettings_primarynav_2_label', 'path' => 'primaryNav[2].label', 'type' => 'text', 'label' => 'Primary Nav 3 / Label', 'default' => 'Approach' ),
				array( 'name' => 'sitesettings_primarynav_3_label', 'path' => 'primaryNav[3].label', 'type' => 'text', 'label' => 'Primary Nav 4 / Label', 'default' => 'Sites' ),
				array( 'name' => 'sitesettings_primarynav_4_label', 'path' => 'primaryNav[4].label', 'type' => 'text', 'label' => 'Primary Nav 5 / Label', 'default' => 'Latest' ),
				array( 'name' => 'sitesettings_primarynav_5_label', 'path' => 'primaryNav[5].label', 'type' => 'text', 'label' => 'Primary Nav 6 / Label', 'default' => 'Contact' ),
				array( 'name' => 'sitesettings_ctanav_signin_label', 'path' => 'ctaNav.signIn.label', 'type' => 'text', 'label' => 'CTA Nav / Sign in / Label', 'default' => 'Sign In' ),
				array( 'name' => 'sitesettings_ctanav_register_label', 'path' => 'ctaNav.register.label', 'type' => 'text', 'label' => 'CTA Nav / Register / Label', 'default' => 'Register' ),
				array( 'name' => 'sitesettings_footer_blurb', 'path' => 'footer.blurb', 'type' => 'text', 'label' => 'Footer / Blurb', 'default' => 'Consistency. Credibility. Visibility.' ),
				array( 'name' => 'sitesettings_footer_sitemap_0_label', 'path' => 'footer.sitemap[0].label', 'type' => 'text', 'label' => 'Footer / Sitemap 1 / Label', 'default' => 'Home' ),
				array( 'name' => 'sitesettings_footer_sitemap_1_label', 'path' => 'footer.sitemap[1].label', 'type' => 'text', 'label' => 'Footer / Sitemap 2 / Label', 'default' => 'About Us' ),
				array( 'name' => 'sitesettings_footer_sitemap_2_label', 'path' => 'footer.sitemap[2].label', 'type' => 'text', 'label' => 'Footer / Sitemap 3 / Label', 'default' => 'REDI Scores' ),
				array( 'name' => 'sitesettings_footer_sitemap_3_label', 'path' => 'footer.sitemap[3].label', 'type' => 'text', 'label' => 'Footer / Sitemap 4 / Label', 'default' => 'Updates' ),
				array( 'name' => 'sitesettings_footer_sitemap_4_label', 'path' => 'footer.sitemap[4].label', 'type' => 'text', 'label' => 'Footer / Sitemap 5 / Label', 'default' => 'Listings' ),
				array( 'name' => 'sitesettings_footer_sitemap_5_label', 'path' => 'footer.sitemap[5].label', 'type' => 'text', 'label' => 'Footer / Sitemap 6 / Label', 'default' => 'Contact' ),
				array( 'name' => 'sitesettings_footer_sitemap_6_label', 'path' => 'footer.sitemap[6].label', 'type' => 'text', 'label' => 'Footer / Sitemap 7 / Label', 'default' => 'Terms & Conditions' ),
				array( 'name' => 'sitesettings_footer_contact_email', 'path' => 'footer.contact.email', 'type' => 'text', 'label' => 'Footer / Contact / Email', 'default' => 'info@redisites.com' ),
				array( 'name' => 'sitesettings_footer_contact_address', 'path' => 'footer.contact.address', 'type' => 'text', 'label' => 'Footer / Contact / Address', 'default' => 'PO Box 18, Fayetteville, AR 72702' ),
				array( 'name' => 'sitesettings_footer_social_linkedin', 'path' => 'footer.social.linkedin', 'type' => 'text', 'label' => 'Footer / Social / Linkedin', 'default' => 'https://www.linkedin.com/company/redi-sites' ),
				array( 'name' => 'sitesettings_footer_copyright', 'path' => 'footer.copyright', 'type' => 'text', 'label' => 'Footer / Copyright', 'default' => '© {year} Site Selectors Guild. All rights reserved.' ),
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
const REDI_PAGES_VERSION        = '2.0.1+cfced78d';

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
					'post_title'   => $page['title'],
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

				$is_list  = 'list' === $field['type'];
				$is_block = 'blocklist' === $field['type'];

				if ( $is_block ) {
					// Rows are entered as blocks so they can be added and removed,
					// which ACF free cannot do with a Repeater. Spell the format
					// out in the instructions - it is the only place it appears.
					$labels = array_map(
						function ( $name ) {
							return ucfirst( str_replace( '_', ' ', $name ) );
						},
						$field['fields']
					);
					$instructions = 'One per block, separated by a blank line. Inside a block: '
						. ( count( $labels ) > 1
							? 'first line is the ' . strtolower( $labels[0] ) . ', the rest is the ' . strtolower( $labels[1] ) . '.'
							: 'the ' . strtolower( $labels[0] ) . '.' )
						. ' Add or remove blocks to add or remove rows. Leave the whole box empty to keep what is on the site now.';
				} elseif ( $is_list ) {
					$instructions = 'One item per block, separated by a blank line. Leave empty to keep what is on the site now.';
				} else {
					$instructions = 'Leave empty to keep what is on the site now.';
				}

				$fields[] = array(
					'key'          => 'field_' . $field['name'],
					'label'        => count( $parts ) > 1 ? implode( ' / ', array_slice( $parts, 1 ) ) : $field['label'],
					'name'         => $field['name'],
					'type'         => $is_list || $is_block || 'textarea' === $field['type'] ? 'textarea' : 'text',
					'rows'         => $is_block ? 14 : ( $is_list ? 8 : 3 ),
					'new_lines'    => '',
					'instructions' => $instructions,
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

							$target = $key . ( '' !== $field['path'] ? '.' . $field['path'] : '' );

							if ( 'list' === $field['type'] ) {
								$items = preg_split( '/\R\s*\R/', $value );
								$items = array_values( array_filter( array_map( 'trim', $items ), 'strlen' ) );
								if ( ! $items ) {
									continue;
								}
								redi_pages_set_path( $out, $target, $items );
							} elseif ( 'blocklist' === $field['type'] ) {
								// A block per row; inside a block, the first line is the
								// first field and everything after it is the second.
								$rows = array();
								foreach ( preg_split( '/\R\s*\R/', $value ) as $block ) {
									$block = trim( $block );
									if ( '' === $block ) {
										continue;
									}
									$lines = preg_split( '/\R/', $block );
									$row   = array();
									if ( count( $field['fields'] ) > 1 ) {
										$row[ $field['fields'][0] ] = trim( array_shift( $lines ) );
										$row[ $field['fields'][1] ] = trim( implode( ' ', array_map( 'trim', $lines ) ) );
									} else {
										$row[ $field['fields'][0] ] = trim( implode( ' ', array_map( 'trim', $lines ) ) );
									}
									// A row whose first field is blank is a stray blank
									// line, not a row the editor meant to create.
									if ( '' === reset( $row ) ) {
										continue;
									}
									$rows[] = $row;
								}
								if ( ! $rows ) {
									continue;
								}
								redi_pages_set_path( $out, $target, $rows );
							} else {
								redi_pages_set_path( $out, $target, $value );
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
