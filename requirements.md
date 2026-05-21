Requirements

All teams must follow these requirements. Failure to follow the requirements may prevent your team from winning medals or prizes.
1. GitLab Repository Link

On every page, teams must add a clear and visible link to the team iGEM GitLab repository (e.g., gitlab.igem.org/2025/example for Example team) in the footer. This is to ensure that future teams and judges can easily find the source code that generated the Wiki.
2. Content Ownership And Licensing

All content created by iGEM teams and hosted on iGEM's websites must be available under the Creative Commons Attribution 4.0 license (or any later version). This license must be displayed in the footer of every Wiki page. The original LICENSE file on the team's Wiki repository must remain unmodified.
Third party assets, such as copyrighted images, fonts, and other materials, are generally not allowed on the Wiki unless they meet the following conditions:
The assets must have a license that explicitly allows reuse, redistribution, and modification (e.g. open-source code, Creative Commons licenses, etc.), allowing the asset to be uploaded to iGEM servers. Only assets with appropriate licenses that allow this are acceptable.
All assets must be uploaded directly to iGEM’s servers. External linking to assets hosted on third-party servers is not permitted.
All content (text, images, prior work from iGEM teams and other research groups) must be properly attributed, referenced or cited.
3. Standard URL Pages: Prizes And Medals Eligibility

For judges to find your work, you must use the Standard URL Pages. These pages have specific URL addresses designated for each judging criterion and are automatically linked to your team's Judging Form. If your documentation for an award is not on the page encoded by the static link, your team may not be judged for that prize.
What does this mean? Regardless of how you style your Wiki, you will need to preserve the designated URLs in order to be evaluated for the awards listed below. Beware! Web design packages that create their own dynamic links will not work!
Below are links to the team "example" Standard URL pages for various judging criteria. For your own pages, please replace "example" with your team name to find the page on your Wiki, or navigate to that page using the menu in your Team Wiki.

Standard URL Pages for Medal Criteria
Medal Criterion	Standard URL Pages for the Medal Criterion
Bronze #2 - Project Attributions	https://2025.igem.wiki/example/attributions
Bronze #3 - Contribution	https://2025.igem.wiki/example/contribution
Silver #1 - Engineering Success	https://2025.igem.wiki/example/engineering
Silver #2 - Human Practices	https://2025.igem.wiki/example/human-practices
Gold Criteria - Select Three Special Prizes	Document your work on Standard Pages required for the Special Prizes you select (see below).

Standard URL Pages for Special Prizes
Special Prize	Standard URL Pages for the Special Prizes
Best Education	https://2025.igem.wiki/example/education
Best Entrepreneurship	https://2025.igem.wiki/example/entrepreneurship
Best Hardware	https://2025.igem.wiki/example/hardware
Inclusivity Award	https://2025.igem.wiki/example/inclusivity
Best Integrated Human Practices	https://2025.igem.wiki/example/human-practices
Best Measurement	https://2025.igem.wiki/example/measurement
Best Model	https://2025.igem.wiki/example/model
Best Plant Synthetic Biology	https://2025.igem.wiki/example/plant
Safety and Security Award	https://2025.igem.wiki/example/safety-and-security
Best Software Tool*	https://2025.igem.wiki/example/software
Best Sustainable Development Impact	https://2025.igem.wiki/example/sustainability

Awards with no required Standard Page
These awards do not have standard URLs. Rather they are documented and/or judged in the ways listed below:
Best Presentation: Based on the evaluation of your Team Presentation Video.
Best Wiki: Based on the evaluation of your entire Team Wiki.
Village Awards: Based on total body of work, not any specific page.
Part Prizes, including Best New Basic Part, Best New Composite Part, Best New Improved Part and Best Part Collection:
Based on the documentation in the Registry for each designated Part.
Part number(s) must be entered into the Judging Form for the corresponding Part Prize(s).
Although not required, teams can add additional pages to their Wiki to describe their best parts and to give context about how they fit into their project.


The judging criteria are described in full detail in the Judging Pages.
4. All Content Must Be Hosted On iGEM Servers

All team pages, images, documents, code, including CSS, JavaScript and font files, must be hosted on iGEM servers (any subdomain of igem.org or igem.wiki):
HTML and all types of source code written by teams must be committed to the Team Wiki repository on the iGEM GitLab.
Images, additional documents (.pdf, .csv, etc.) and fonts, must be uploaded to iGEM's own CDN static.igem.wiki using tools.igem.org/uploads.
Videos must be uploaded to the iGEM Video Universe and embedded from there. Please follow these instructions.
iGEM Foundation content hosted on igem.org can also be used on Team Wikis.
Why? We preserve all iGEM content on our own servers, so future teams can learn from what you have done. When you store content on external sites or servers, links might become broken, sites might go down and information is likely to be lost.
Use the External Content Check tool to verify that all content and requests on your Wiki follow this requirement. Failing this check disqualifies your team from Best Wiki and Best Software Tool Awards.

Judges will only evaluate content hosted on iGEM servers. Furthermore, displaying content hosted on external servers or CDNs, including external font providers, is strictly prohibited. This is considered a form of cheating and may result in disqualification from medals.

Note for package managers: The preferred way for using libraries is through package managers (npm, yarn, pip). Behind the scenes, package managers download the libraries, build the team Wiki and publish the resulting assets on our servers.
5. iframes Can Only Be Used To Show Content Hosted On iGEM Servers

You may use iframes to display a file that you have uploaded to iGEM servers (igem.org or igem.wiki) or the iGEM Video Universe (video.igem.org). iframes are not permitted on the iGEM Wiki to display content from another website or server (see above). Some common examples that are NOT permitted in an iframe include videos hosted on YouTube or Bilibili, and documents hosted on Google Drive or Microsoft Teams.
Note: Using iframes to show any non-iGEM server content is a form of cheating and will result in medal disqualification for your team.
6. All Source Code Used To Generate Your Wiki Must Be Provided In Your GitLab Repository

All source code used to generate your Wiki must be provided in your GitLab repository, including a properly configured CI/CD pipeline. The build process for your Wiki must be automated and executed via a .gitlab-ci.yml file in your repository.
Teams must not upload pre-generated HTML, CSS, or JavaScript files directly. Instead, the Wiki should be built from the source code using the CI/CD pipeline when deployed.
If you choose to use a custom HTML, CSS or JS generator instead of the default template, your GitLab repository must include a .gitlab-ci.yml file that automates the Wiki build process. This enables judges, other teams and anyone interested, to easily regenerate your Wiki using the source code in the future.
Recommendations

Explore GitLab Tools

GitLab is a powerful project management platform with many tools. Teams are encouraged to use Issues, Boards, Merge Requests and code review to organise, plan and distribute their tasks.
URL Naming Conventions

iGEM has adopted the following URL naming convention for better usability: - URLs should be in lowercase. - All characters except 0-9 and a-z should be replaced with -. - No leading or trailing -. e.g. /-page-name or /page-name-. - For example, the old format 2021.igem.org/Team:TeamName/Page_Name would become 2025.igem.wiki/team-name/page-name.
Using Software Tools Or Other Git Repositories

If you are using a separate program or software tool to create your Wiki pages (e.g. Github repository), we highly advise that you test importing the code over to your Team Wiki repository as early as possible. When you import pages that have been designed via other programs or that were hosted on other git platforms, it often takes time and effort to understand how to bring the correct files over. Do not wait until the week of the Wiki Freeze to test this! You may experience serious problems, and it may take longer than you expect to upload and build your website properly.

Frequently Asked Questions

If you have any questions that are not answered here, do not hesitate to send them to the iGEM 2025 Global Slack in the #wiki channel.

Can I change my Wiki template later?
No. After you activate your Team Wiki, there is no way to automatically switch to a different Wiki template. To change template, you would need to manually delete all of your repository files, manually upload all of the files from the other template, and manually update the content with your team name, year and attributions form. We do not recommend this.

I made modifications in the code, but the Wiki stayed the same. Why?
Please use the following checklist to troubleshoot this issue:
The modifications were made in the correct repository, which must be inside the 2025 Competition group;
The modifications were committed to the main branch; and,
The status shown in the pipeline Badge is passed.
If all of the above are confirmed, then you are most likely editing the wrong file. In this case, we may be able to help you. Please send a message in the #wiki channel of the iGEM 2025 Global Slack.

Can I use this library/framework that everyone is talking about?
If the library meets the following requirements, then yes, go ahead:
It functions as a static site generator (generating .html, .css and .js files). For example, GitLab Pages does not support server-side languages such as PHP, Ruby or Python. To learn more, GitLab has a very informative blog post about static websites compared to dynamic websites.
You can adapt the .gitlab-ci.yml file to make it work for your library.
It can be used for open-source projects and does not require any licensing.
Please also keep in mind that our software staff might not be able to provide support to teams using a different template or programming languages that we are not familiar with.

Can I call my backend APIs (for ChatBot or web server) in the Wiki?
Only requests to the domains igem.org and igem.wiki are allowed. This means that any attempt to send or receive data, access resources, or interact with content hosted on servers other than igem.org and igem.wiki is strictly forbidden. Requests to any external servers, websites, or online services that do not fall under these two specified domains are prohibited. Failing to comply with this restriction may result in medal disqualification for your team. Read more here.
You can check whether your Wiki respects this requirement by using the External Content Check tool.

The pipeline fails with “ERROR: Uploading artifacts as archive to coordinator. 413 Request Entity Too Large.”
This error is commonly caused by uploading large files (e.g., images, fonts, .pdf documents, etc.) to your GitLab repository instead of using tools.igem.org/uploads. The maximum job artifact size for the Team Wiki is 5 MB. If you do not have large files and you still see this error, please send a message in the #wiki channel of the iGEM 2025 Global Slack.

The pipeline fails with “ERROR: jinja2.exceptions.TemplateSyntaxError: Unexpected end of template. Jinja was looking for the following tags: 'endblock'. The innermost block that needs to be closed is 'block'.”
This error means that at least one page on your Wiki has a missing {% endblock %} at the end of its file (located at /wiki/pages/**.html). The page name is indicated in the last few lines of the job log. For example: ValueError: Unexpected status '500 INTERNAL SERVER ERROR' on URL /attributions indicates that the problem is in the file /wiki/pages/attributions.html.


Step 1: Activate Your Wiki

Start by activating your Wiki with one of three Wiki templates. You can select a template based on your team's web development skill level.
Go to teams.igem.org-> Select your team -> Scroll to "Team Deliverables Overview" -> Click the "Deliverables Dashboard" button. Note: Please log in to access the deliverables dashboard.
Scroll to "Team Wiki" and click the green arrow in the right-hand column of the table.
Select your template:
Markdown (Beginner)
HTML (Intermediate)
React (Advanced)
Click "Confirm" to activate your Team Wiki.
Once activated, you will find your Team Wiki at the following URL: https://2025.igem.wiki/team-name, with "team-name" being your registered team name (ex: Team Example's URL would be: https://2025.igem.wiki/example).
Team List
Step 2: Start Editing

Templates are just a starting point. You can modify the code to suit your team's needs. Feel free to explore the code and make changes to the design, layout and content.
Go to gitlab.igem.org -> Sign in using your iGEM Account.
Select your team from the list to see your team's Wiki repository. Note: You must be an official member of the Team Roster to edit your team's Wiki.
Please visit the iGEM GitLab Guide for more detailed instructions on how to edit your Team Wiki:
iGEM GitLab Gui