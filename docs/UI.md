# Extension UI design

1. **Popup UI**: The popup UI is the main interface that users interact with when they click on the extension icon in their browser. It provides a user-friendly way to manage resumes, settings, and other functionalities.

2. Onboarding Steps: The onboarding process is designed to guide users through the initial setup of the extension. It includes steps for uploading resumes, configuring settings, and understanding how to use the extension effectively.

3. **Settings**: The settings section allows users to customize their experience with the extension. Users can manage preferences related to resume formats, LLM providers, and other configurations.

# Onboarding flow
1. **Step 1: Setting local password**: Users are prompted to set a local password for secure access to their resume, autofill and other features. This step ensures that sensitive information is protected.

2. **Step 2: Setting up Openai compatible API key**: Users are guided to set up an OpenAI compatible API key and base URL. This step is crucial for enabling the extension to interact with language models for autofill and other functionalities.

# **Step 3: Profile creation flow**: Users can create profiles that include their resume and other relevant information. This step allows users to manage multiple profiles for different job applications.

## Fields to be filled in profile creation flow
- **Profile Name**: A unique name for the profile to easily identify it.
- **Resume PDF**: Users can upload their resume in PDF format.
- **Switch**: A toggle switch for the user to decide if they want to give a markdown of resume in addition to the PDF. If the switch is on, the user will be prompted to provide a markdown version of their resume.
- **Upload**: User should be able to either upload both PDF and markdown or provide a url for any of the two. If the user provides a url, the extension will fetch the resume from the url and store it in the extension's storage.
- **Preview**: The extension should provide a preview of the uploaded resume and extracted markdown. This allows users to verify that the correct documents have been uploaded and that the information is accurate.
- **Submit**: Once the user has filled in all the required fields and is satisfied with the information provided, they can submit the profile. The extension will then save the profile for future use in job applications.